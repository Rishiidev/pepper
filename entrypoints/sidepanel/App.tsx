import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, History, Plus, RotateCcw, Star, X } from 'lucide-react';
import { Logo } from '../../src/components/brand/Logo';
import { FocusQuickStart } from '../../src/components/focus/FocusQuickStart';
import { AddToWorkspaceMenu } from '../../src/components/workspace/AddToWorkspaceMenu';
import { CaptureToast } from '../../src/components/feedback/CaptureToast';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { useTodayTimeline } from '../../src/components/timeline/useTodayTimeline';
import { Button, IconButton, Card, CardHeader, FaviconStack, Kbd, Sparkline, ToastHost, toast } from '../../src/components/ui';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { useCommandStore } from '../../src/stores/command-store';
import { workspaceMembership } from '../../src/core/engines/workspace-membership';
import { workspaceEngine } from '../../src/core/engines/workspace-engine';
import { restoreEngine } from '../../src/core/engines/restore-engine';
import { sessionEngine } from '../../src/core/engines/session-engine';
import { suggestFromTabs, WorkspaceSuggestion } from '../../src/core/engines/suggest-workspace';
import { announceAdded } from '../../src/core/engines/capture-feedback';
import { buildRecap, dayBounds, describeEvent, hourlyActivity, visibleEvents } from '../../src/core/engines/timeline-replay';
import { focusEngine } from '../../src/core/engines/focus-engine';
import { FocusSession } from '../../src/core/types/focus-session';
import { PepperTab } from '../../src/core/types/session';

const DISMISSED_KEY = 'pepper_dismissed_suggestions';

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

const clock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function App() {
  const { sessions, fetchSessions } = useSessionStore();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { openPalette } = useCommandStore();
  const { events } = useTodayTimeline();
  const [tabs, setTabs] = useState<PepperTab[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  const loadTabs = useCallback(async () => {
    setTabs(await workspaceEngine.getActiveWindowTabs());
  }, []);

  useEffect(() => {
    void fetchSessions();
    void fetchSettings();
    void loadTabs();
    void focusEngine.getAllSessions().then(setFocusSessions);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void loadTabs(), 400);
    };
    chrome.tabs.onCreated.addListener(refresh);
    chrome.tabs.onUpdated.addListener(refresh);
    chrome.tabs.onRemoved.addListener(refresh);
    chrome.tabs.onActivated.addListener(refresh);
    return () => {
      chrome.tabs.onCreated.removeListener(refresh);
      chrome.tabs.onUpdated.removeListener(refresh);
      chrome.tabs.onRemoved.removeListener(refresh);
      chrome.tabs.onActivated.removeListener(refresh);
    };
  }, [fetchSessions, fetchSettings, loadTabs]);

  const active = sessions.find((s) => s.id === settings.activeWorkspaceId) ?? null;
  const suggestions = useMemo(() => suggestFromTabs(tabs, sessions, { dismissed }).slice(0, 2), [tabs, sessions, dismissed]);
  const day = dayBounds(Date.now());
  const recap = useMemo(() => buildRecap(events, focusSessions, day), [events, focusSessions, day.from]);
  const spark = useMemo(() => hourlyActivity(events, day.from).slice(0, new Date().getHours() + 1), [events, day.from]);
  const recent = useMemo(() => visibleEvents(events).slice(-6).reverse(), [events]);

  const dismiss = (key: string) => {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next].slice(-100)));
    } catch {
      // storage blocked
    }
  };

  const applySuggestion = async (s: WorkspaceSuggestion) => {
    if (s.kind === 'add' && s.workspaceId) {
      const res = await workspaceMembership.addTabs(s.workspaceId, s.tabs);
      toast(`Added ${res.added} tab${res.added !== 1 ? 's' : ''} to ${res.workspace.name}`);
    } else {
      const ws = await workspaceMembership.createFromTabs(s.topic, s.tabs);
      await workspaceMembership.setActiveWorkspace(ws.id);
      toast(`Created ${ws.name}`, {
        actionLabel: 'Undo',
        onAction: async () => {
          await sessionEngine.deleteSession(ws.id);
          await workspaceMembership.setActiveWorkspace(null);
          await fetchSessions();
        },
      });
    }
    await fetchSessions();
  };

  const addCurrentTab = async () => {
    const [current] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!current?.url) return;
    const res = await workspaceMembership.addToActiveOrInbox([{ id: current.id, url: current.url, title: current.title || current.url, favIconUrl: current.favIconUrl || '', index: 0 }]);
    if (res) {
      toast(res.added > 0 ? `Added to ${res.workspace.name}` : `Already in ${res.workspace.name}`);
      void announceAdded(res.workspace.name, res.added, res.skipped);
    } else {
      toast('This tab cannot be saved');
    }
    await fetchSessions();
  };

  const openDashboard = (query = '') => chrome.tabs.create({ url: chrome.runtime.getURL(`manager.html${query}`) });

  return (
    <main className="min-h-screen p-4 space-y-4 text-sm">
      <CommandPalette />
      <CaptureToast />
      <ToastHost />

      <header className="flex items-center justify-between">
        <Logo showText size={22} />
        <div className="flex items-center gap-1 -mr-2">
          <IconButton aria-label="Search (⌘K)" onClick={openPalette}>
            <Kbd className="!border-0">⌘K</Kbd>
          </IconButton>
          <IconButton aria-label="Open dashboard" onClick={() => openDashboard()}>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <FocusQuickStart primary />

      {/* Active workspace */}
      <Card as="section" aria-labelledby="sp-active" pad="sm" className="space-y-4">
        <CardHeader eyebrow="Active workspace" titleId="sp-active" title={active ? active.name : 'None yet'} icon={<Star className={`w-4 h-4 ${active ? 'fill-current' : ''}`} />} />
        {active ? (
          <div className="space-y-2">
            <FaviconStack items={active.tabs} max={6} total={active.tabCount} />
            <ul className="space-y-0.5 max-h-28 overflow-y-auto">
              {active.tabs.slice(0, 30).map((t) => (
                <li key={t.url} className="truncate text-xs">
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-text-secondary hover:text-text-primary hover:underline">
                    {t.title || t.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Star a workspace from any “+” menu. New tabs and Alt+Shift+A will go there.</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={addCurrentTab} className="flex-1">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add current tab{active ? '' : ' to Inbox'}
          </Button>
          {active && (
            <Button size="sm" variant="ghost" onClick={() => restoreEngine.restoreSession(active.id)}>
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reopen
            </Button>
          )}
        </div>
      </Card>

      {/* Suggestions */}
      {suggestions.map((s) => (
        <Card key={s.key} tone="butter" as="section" aria-label="Suggestion" pad="sm" className="space-y-4">
          <CardHeader
            eyebrow="Suggestion"
            title={s.kind === 'add' ? `Add ${s.tabs.length} open tabs to “${s.workspaceName}”?` : `Group ${s.tabs.length} tabs about ${s.topic}?`}
            action={
              <IconButton aria-label="Dismiss suggestion" onClick={() => dismiss(s.key)} className="!text-current hover:!bg-black/10">
                <X className="w-4 h-4" aria-hidden="true" />
              </IconButton>
            }
          />
          <FaviconStack items={s.tabs} max={6} ring="var(--pp-butter-bg)" />
          <Button size="sm" onClick={() => applySuggestion(s)}>
            {s.kind === 'add' ? 'Add them' : 'Create workspace'}
          </Button>
        </Card>
      ))}

      {/* Open tabs */}
      <Card as="section" aria-labelledby="sp-tabs" pad="sm" className="space-y-3">
        <CardHeader eyebrow="This window" titleId="sp-tabs" title={`Open tabs (${tabs.length})`} />
        <ul className="-mx-1">
          {tabs.map((t) => (
            <li key={`${t.id}-${t.url}`} className="flex items-center gap-2 rounded-input px-1 py-1 hover:bg-surface-hover">
              {t.favIconUrl ? <img src={t.favIconUrl} alt="" className="w-4 h-4 rounded shrink-0" /> : <span className="w-4 h-4 shrink-0" />}
              <button type="button" onClick={() => t.id !== undefined && chrome.tabs.update(t.id, { active: true })} className="flex-1 min-w-0 truncate text-left text-sm" title={t.url}>
                {t.title || t.url}
              </button>
              <AddToWorkspaceMenu tabs={[t]} label={`Add ${t.title || t.url} to a workspace`} />
            </li>
          ))}
        </ul>
      </Card>

      {/* Today */}
      <Card tone="lilac" as="section" aria-labelledby="sp-timeline" pad="sm" className="space-y-4">
        <CardHeader
          eyebrow="Today"
          titleId="sp-timeline"
          title={settings.sessionTrackingEnabled ? recap.sentence : 'See your browser day'}
          icon={<History className="w-4 h-4" />}
        />
        {!settings.sessionTrackingEnabled ? (
          <>
            <p className="text-sm opacity-90">Record a private timeline of when you opened Chrome and which tabs you used. It stays on this device.</p>
            <Button size="sm" onClick={() => updateSettings({ sessionTrackingEnabled: true })}>
              Turn on session timeline
            </Button>
          </>
        ) : (
          <>
            <Sparkline values={spark} width={280} height={40} className="w-full" />
            <ol className="space-y-1">
              {recent.length === 0 && <li className="text-sm opacity-80">Nothing recorded yet today.</li>}
              {recent.map((e, i) => (
                <li key={`${e.ts}-${i}`} className="flex items-center gap-2 text-xs">
                  <time className="w-14 shrink-0 font-mono opacity-80">{clock(e.ts)}</time>
                  <span className="flex-1 min-w-0 truncate">{describeEvent(e)}</span>
                  {e.url && ['tab_open', 'tab_switch', 'tab_navigate'].includes(e.type) && (
                    <AddToWorkspaceMenu tabs={[{ url: e.url, title: e.title || e.url, favIconUrl: '', index: 0 }]} label={`Add ${e.title || e.url} to a workspace`} />
                  )}
                </li>
              ))}
            </ol>
            <Button size="sm" variant="secondary" onClick={() => openDashboard('?view=timeline')}>
              Open full timeline
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
