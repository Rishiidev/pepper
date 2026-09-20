import React, { useEffect, useState } from 'react';
import { Home, Layers, CalendarClock, Timer, Settings as SettingsIcon, Search, Pause, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { useCommandStore } from '../../src/stores/command-store';
import { useFocusStore } from '../../src/stores/focus-store';
import { Logo } from '../../src/components/brand/Logo';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { CaptureToast } from '../../src/components/feedback/CaptureToast';
import { OnboardingModal } from '../../src/components/modals/OnboardingModal';
import { MemoryReconstructionOverlay } from '../../src/components/MemoryReconstructionOverlay';
import { SessionCompleteModal } from '../../src/components/focus/SessionCompleteModal';
import { FocusView } from '../../src/components/focus/FocusView';
import { HomeView } from '../../src/components/home/HomeView';
import { WorkspacesView } from '../../src/components/workspaces/WorkspacesView';
import { TimelineView } from '../../src/components/timeline/TimelineView';
import { SettingsView } from '../../src/components/settings/SettingsView';
import { Button, IconButton, Kbd, ToastHost, toast } from '../../src/components/ui';
import { sessionEngine } from '../../src/core/engines/session-engine';
import { formatClock } from '../../src/core/engines/focus-timing';
import { PepperSession } from '../../src/core/types/session';

type View = 'home' | 'workspaces' | 'timeline' | 'focus' | 'settings';

const NAV: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" aria-hidden="true" /> },
  { id: 'workspaces', label: 'Workspaces', icon: <Layers className="w-5 h-5" aria-hidden="true" /> },
  { id: 'timeline', label: 'Timeline', icon: <CalendarClock className="w-5 h-5" aria-hidden="true" /> },
  { id: 'focus', label: 'Focus', icon: <Timer className="w-5 h-5" aria-hidden="true" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" aria-hidden="true" /> },
];

const initialView = (): View => {
  const v = new URLSearchParams(window.location.search).get('view');
  return NAV.some((n) => n.id === v) ? (v as View) : 'home';
};

export default function App() {
  const { fetchSessions, saveWorkspace } = useSessionStore();
  const { settings, isHydrated, fetchSettings } = useSettingsStore();
  const { openPalette } = useCommandStore();
  const { activeSession, activeMemory, isRunning, isPaused, elapsedSeconds, completedSessionForModal, pauseFocus, resumeFocus, completeFocus, clearCompletedModal } = useFocusStore();

  const [view, setView] = useState<View>(initialView);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [restoring, setRestoring] = useState<PepperSession | null>(null);

  useEffect(() => {
    void fetchSessions();
    void fetchSettings();
  }, [fetchSessions, fetchSettings]);

  // First launch: show the tour once settings are read from storage
  useEffect(() => {
    if (isHydrated && settings.hasCompletedOnboarding === false) setOnboardingOpen(true);
  }, [isHydrated, settings.hasCompletedOnboarding]);

  const saveWindow = async () => {
    const session = await saveWorkspace();
    if (!session) {
      toast('No web tabs to save in your browser windows');
      return;
    }
    toast(`Saved ${session.tabCount} tab${session.tabCount !== 1 ? 's' : ''} as “${session.name}”`, {
      actionLabel: 'Undo',
      onAction: async () => {
        await sessionEngine.deleteSession(session.id);
        await fetchSessions();
      },
    });
  };

  const countdown = activeSession && activeSession.mode !== 'stopwatch' && activeSession.durationSeconds > 0;
  const shown = activeSession ? (countdown ? Math.max(0, activeSession.durationSeconds - elapsedSeconds) : elapsedSeconds) : 0;

  return (
    <div className="min-h-screen bg-surface text-text-primary lg:flex">
      <a href="#main" className="sr-only-focusable fixed top-2 left-2 z-[80] rounded-full bg-surface-card border border-border px-4 py-2 text-sm font-semibold">
        Skip to content
      </a>
      <CommandPalette />
      <CaptureToast />
      <ToastHost />
      <OnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      {completedSessionForModal && <SessionCompleteModal session={completedSessionForModal} onClose={() => clearCompletedModal()} />}
      {restoring && <MemoryReconstructionOverlay memory={restoring} onComplete={() => { setRestoring(null); void fetchSessions(); }} onCancel={() => setRestoring(null)} />}

      {/* Sidebar: icon rail on narrow screens */}
      <aside aria-label="Sidebar" className="lg:sticky lg:top-0 lg:h-screen shrink-0 lg:w-60 border-b lg:border-b-0 lg:border-r border-border bg-surface flex lg:flex-col gap-2 p-3 lg:p-4">
        <div className="hidden lg:block px-2 py-3">
          <Logo showText size={26} />
        </div>
        <nav aria-label="Main" className="flex lg:flex-col gap-1 flex-1 lg:flex-none overflow-x-auto">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setView(n.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${active ? 'bg-text-primary text-surface-card' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
              >
                {n.icon}
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="hidden lg:flex flex-1 items-end">
          <Button variant="ghost" size="sm" onClick={() => setOnboardingOpen(true)} className="w-full justify-start">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Take the tour
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-surface border-b border-border px-4 md:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Find anything"
            className="flex h-10 flex-1 max-w-lg items-center gap-2 rounded-full border bg-surface-card px-4 text-sm text-text-muted hover:bg-surface-hover"
            style={{ borderColor: 'var(--pp-border-strong)' }}
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span className="flex-1 text-left whitespace-nowrap">Find anything</span>
            <Kbd>⌘K</Kbd>
          </button>
          <div className="flex-1" />
          <Button onClick={saveWindow} data-testid="save-window-top">
            Save window
          </Button>
        </header>

        <main id="main" className="flex-1 w-full max-w-[1168px] mx-auto px-4 md:px-6 py-6 pb-28">
          {view === 'home' && <HomeView onRestore={setRestoring} onNavigate={setView} onStartDemo={() => setOnboardingOpen(true)} onSave={saveWindow} />}
          {view === 'workspaces' && <WorkspacesView onRestore={setRestoring} onSave={saveWindow} />}
          {view === 'timeline' && <TimelineView />}
          {view === 'focus' && <FocusView />}
          {view === 'settings' && <SettingsView onStartTour={() => setOnboardingOpen(true)} />}
        </main>
      </div>

      {/* Running timer, visible on every page */}
      {isRunning && activeSession && activeMemory && (
        <div role="region" aria-label="Running focus timer" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-zone-ink text-zone-ink-fg border border-zone-ink-edge pl-5 pr-2 py-2 shadow-lg">
          <div className="leading-tight max-w-44">
            <p className="text-sm font-bold truncate">{activeMemory.name}</p>
            <p className="text-xs opacity-75">{isPaused ? 'Paused' : 'Focusing'}</p>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums">{formatClock(shown)}</span>
          {isPaused ? (
            <IconButton aria-label="Resume" onClick={resumeFocus} className="!text-current hover:!bg-white/10">
              <Play className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton aria-label="Pause" onClick={pauseFocus} className="!text-current hover:!bg-white/10">
              <Pause className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          )}
          <IconButton aria-label="Finish focus session" onClick={() => completeFocus()} className="!text-current hover:!bg-white/10">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </div>
  );
}
