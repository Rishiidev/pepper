import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock, LayoutTemplate, PlayCircle, Search, Upload, Zap } from 'lucide-react';
import { PepperSession, PepperTab } from '../../core/types/session';
import { INBOX_SESSION_ID } from '../../core/constants/ids';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import { useCommandStore } from '../../stores/command-store';
import { useTodayTimeline } from '../timeline/useTodayTimeline';
import { Button, Card, CardHeader, Chip, FaviconStack, Kbd, ProgressRing, Sparkline, Stat, toast } from '../ui';
import { InlineRename } from '../feedback/InlineRename';
import { FocusQuickStart } from '../focus/FocusQuickStart';
import { RecoveryBanner } from '../recovery/RecoveryBanner';
import { recoveryEngine } from '../../core/engines/recovery-engine';
import { sessionEngine } from '../../core/engines/session-engine';
import { workspaceEngine } from '../../core/engines/workspace-engine';
import { workspaceMembership } from '../../core/engines/workspace-membership';
import { suggestFromTabs, WorkspaceSuggestion } from '../../core/engines/suggest-workspace';
import { buildRecap, dayBounds, formatDurationCompact, hourlyActivity } from '../../core/engines/timeline-replay';
import { focusEngine } from '../../core/engines/focus-engine';
import { FocusSession } from '../../core/types/focus-session';
import { ACTIVATION_KEY, ActivationState, checklist, emptyActivation, getActivation, patchActivation } from '../../core/engines/activation';
import { timelineStore } from '../../core/engines/timeline-store';
import { BrowserSession } from '../../core/types/timeline';

const ago = (ts: number) => {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

interface Props {
  onRestore: (s: PepperSession) => void;
  onNavigate: (view: 'workspaces' | 'timeline' | 'settings') => void;
  onStartDemo: () => void;
  onSave: () => void;
}

export const HomeView: React.FC<Props> = ({ onRestore, onNavigate, onStartDemo, onSave }) => {
  const { sessions, fetchSessions } = useSessionStore();
  const { settings, updateSettings } = useSettingsStore();
  const { openPalette, setSearchQuery } = useCommandStore();
  const { events } = useTodayTimeline();
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [activation, setActivation] = useState<ActivationState>(emptyActivation());
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [liveTabs, setLiveTabs] = useState<PepperTab[]>([]);
  const [interrupted, setInterrupted] = useState<BrowserSession | null>(null);
  const [dismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('pepper_dismissed_suggestions') || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    void focusEngine.getAllSessions().then(setFocusSessions);
    void getActivation().then(setActivation);
    void recoveryEngine.getRecoveredSessions().then((r) => setRecoveredCount(r.length));
    void workspaceEngine.getActiveWindowTabs().then(setLiveTabs);
    void timelineStore.getSessions(Date.now() - 86_400_000).then((list) => setInterrupted(list.find((s) => s.endReason === 'interrupted') ?? null));
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[ACTIVATION_KEY]) void getActivation().then(setActivation);
    };
    chrome.storage?.onChanged.addListener(onChanged);
    return () => chrome.storage?.onChanged.removeListener(onChanged);
  }, []);

  const real = useMemo(() => sessions.filter((s) => s.id !== INBOX_SESSION_ID), [sessions]);
  const latest = real[0];
  const day = dayBounds(Date.now());
  const recap = useMemo(() => buildRecap(events, focusSessions, day), [events, focusSessions, day.from]);
  const spark = useMemo(() => hourlyActivity(events, day.from).slice(0, new Date().getHours() + 1), [events, day.from]);
  const suggestion: WorkspaceSuggestion | undefined = useMemo(() => suggestFromTabs(liveTabs, sessions, { dismissed })[0], [liveTabs, sessions, dismissed]);
  const topSites = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of real) for (const d of s.domainClusters ?? []) counts.set(d, (counts.get(d) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d]) => d);
  }, [real]);
  const steps = checklist(activation);
  const doneCount = steps.filter((s) => s.done).length;

  const applySuggestion = async (s: WorkspaceSuggestion) => {
    if (s.kind === 'add' && s.workspaceId) {
      const res = await workspaceMembership.addTabs(s.workspaceId, s.tabs);
      toast(`Added ${res.added} tab${res.added !== 1 ? 's' : ''} to ${res.workspace.name}`);
    } else {
      const ws = await workspaceMembership.createFromTabs(s.topic, s.tabs);
      toast(`Created ${ws.name}`, { actionLabel: 'Undo', onAction: async () => void (await sessionEngine.deleteSession(ws.id)) });
    }
    await fetchSessions();
  };

  // First run: nothing saved yet
  if (real.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-bold leading-tight">Close it. It’s saved.</h1>
        <div className="grid grid-cols-12 gap-4">
          <Card tone="lilac" className="col-span-12 lg:col-span-6 space-y-4">
            <CardHeader eyebrow="Start here" title="See it work in 10 seconds" icon={<PlayCircle className="w-4 h-4" />} />
            <p className="text-sm">We open three tabs, you close the window, and Pepper brings it all back.</p>
            <Button variant="primary" onClick={onStartDemo}>
              Try the demo
            </Button>
          </Card>
          <Card tone="mint" className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-2">
            <CardHeader eyebrow="Automatic" title="Nothing to remember" icon={<Zap className="w-4 h-4" />} />
            <p className="text-sm">Close any window with two or more tabs and it shows up here.</p>
          </Card>
          <Card className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-3">
            <CardHeader eyebrow="Already have tabs?" title="Save this window" icon={<LayoutTemplate className="w-4 h-4" />} />
            <Button onClick={onSave}>Save window</Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
              <Upload className="w-4 h-4" aria-hidden="true" />
              Import a backup
            </Button>
          </Card>
        </div>
        {!activation.checklistDismissed && <Checklist steps={steps} done={doneCount} onDismiss={() => patchActivation({ checklistDismissed: true })} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Home</h1>
      <div className="grid grid-cols-12 gap-4">
        {/* Resume: the ink hero */}
        <Card tone="ink" as="section" aria-labelledby="home-resume" className="col-span-12 lg:col-span-7 lg:row-span-2 flex flex-col justify-between gap-6 min-h-64" data-testid="resume-card">
          <div className="space-y-2">
            <p className="eyebrow opacity-75">Continue where you left off</p>
            <h2 id="home-resume" className="text-[28px] font-bold leading-tight">
              <InlineRename value={latest.name} label="Workspace name" className="max-w-full" onSave={async (n) => void (await sessionEngine.updateSession(latest.id, { name: n }))} />
            </h2>
            <p className="text-sm opacity-80">
              {latest.tabCount} tab{latest.tabCount !== 1 ? 's' : ''} · {ago(latest.createdAt)}
              {latest.captureType === 'auto_window_close' ? ' · Auto-saved' : latest.captureType === 'crash_recovery' ? ' · Recovered' : ''}
            </p>
          </div>
          <div className="space-y-4">
            <ul className="space-y-1" aria-label="Tabs in this workspace">
              {latest.tabs.slice(0, 4).map((t) => (
                <li key={t.url} className="truncate text-sm opacity-85">
                  {t.title || t.url}
                </li>
              ))}
              {latest.tabCount > 4 && <li className="text-sm opacity-70">+ {latest.tabCount - 4} more</li>}
            </ul>
            <FaviconStack items={latest.tabs} max={8} size={36} ring="var(--pp-ink-bg)" total={latest.tabCount} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => onRestore(latest)} data-testid="resume-button">
                Resume
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('workspaces')}>
                All workspaces
              </Button>
            </div>
          </div>
        </Card>

        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <FocusQuickStart />
        </div>

        {/* Today */}
        <Card tone="lilac" as="section" aria-labelledby="home-today" className="col-span-12 md:col-span-6 lg:col-span-5 space-y-3">
          <CardHeader eyebrow="Today" titleId="home-today" title={settings.sessionTrackingEnabled ? 'Your day so far' : 'See your browser day'} icon={<Clock className="w-4 h-4" />} />
          {settings.sessionTrackingEnabled ? (
            <>
              <div className="flex items-end justify-between gap-4">
                <Stat label="Active" value={formatDurationCompact(recap.activeMs)} hint={recap.topDomains[0] ? `Mostly ${recap.topDomains[0].label}` : undefined} />
                <Sparkline values={spark} width={130} height={44} />
              </div>
              <Button size="sm" onClick={() => onNavigate('timeline')}>
                Open timeline
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm">Record a private timeline of when you opened Chrome and what you used.</p>
              <Button size="sm" onClick={() => updateSettings({ sessionTrackingEnabled: true })}>
                Turn on
              </Button>
            </>
          )}
        </Card>

        {/* Recent workspaces */}
        <Card as="section" aria-labelledby="home-recent" className="col-span-12 lg:col-span-7 lg:row-span-2 space-y-3">
          <CardHeader
            eyebrow="Workspaces"
            titleId="home-recent"
            title="Recent"
            action={
              <Button size="sm" variant="ghost" onClick={() => onNavigate('workspaces')}>
                See all
              </Button>
            }
          />
          <ul className="-mx-2">
            {real.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-inner px-2 py-2 hover:bg-surface-hover">
                <FaviconStack items={s.tabs} max={3} size={26} total={s.tabCount} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-text-muted">
                    {s.tabCount} tabs · {ago(s.createdAt)}
                  </p>
                </div>
                {s.captureType === 'crash_recovery' && <Chip tone="butter">Recovered</Chip>}
                <Button size="sm" variant="secondary" aria-label={`Restore ${s.name}`} onClick={() => onRestore(s)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Needs attention: recovery, then a suggestion, then an interrupted session */}
        {recoveredCount > 0 ? (
          <div className="col-span-12 lg:col-span-5">
            <RecoveryBanner compact />
          </div>
        ) : suggestion ? (
          <Card tone="butter" as="section" aria-label="Suggestion" className="col-span-12 lg:col-span-5 space-y-3">
            <CardHeader eyebrow="Suggestion" title={suggestion.kind === 'add' ? `Add ${suggestion.tabs.length} open tabs to “${suggestion.workspaceName}”?` : `Group ${suggestion.tabs.length} tabs about ${suggestion.topic}?`} />
            <FaviconStack items={suggestion.tabs} max={6} ring="var(--pp-butter-bg)" />
            <Button size="sm" onClick={() => applySuggestion(suggestion)}>
              {suggestion.kind === 'add' ? 'Add them' : 'Create workspace'}
            </Button>
          </Card>
        ) : interrupted ? (
          <Card tone="butter" as="section" aria-label="Interrupted session" className="col-span-12 lg:col-span-5 space-y-3">
            <CardHeader eyebrow="Needs attention" title="Chrome closed unexpectedly" />
            <p className="text-sm">Your last session ended at {new Date(interrupted.lastEventAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. See what was open.</p>
            <Button size="sm" onClick={() => onNavigate('timeline')}>
              Open timeline
            </Button>
          </Card>
        ) : null}

        {/* Find anything */}
        <Card as="section" aria-labelledby="home-find" className="col-span-12 lg:col-span-5 space-y-3">
          <CardHeader eyebrow="Search" titleId="home-find" title="Find anything" action={<Kbd>⌘K</Kbd>} />
          <button type="button" onClick={openPalette} className="flex h-11 w-full items-center gap-2 rounded-full border px-4 text-sm text-text-muted hover:bg-surface-hover" style={{ borderColor: 'var(--pp-border-strong)' }}>
            <Search className="w-4 h-4" aria-hidden="true" />
            Search workspaces, tabs and sites
          </button>
          {topSites.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topSites.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setSearchQuery(d);
                    openPalette();
                  }}
                  className="h-8 rounded-full border px-3 text-xs font-semibold hover:bg-surface-hover"
                  style={{ borderColor: 'var(--pp-border-strong)' }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {!activation.checklistDismissed && doneCount < steps.length && <Checklist steps={steps} done={doneCount} onDismiss={() => patchActivation({ checklistDismissed: true })} />}
    </div>
  );
};

const Checklist: React.FC<{ steps: Array<{ id: string; label: string; done: boolean }>; done: number; onDismiss: () => void }> = ({ steps, done, onDismiss }) => (
  <Card as="section" aria-labelledby="home-start" className="flex flex-wrap items-center gap-5" data-testid="checklist">
    <ProgressRing value={done / steps.length} size={64} stroke={6} label="Getting started progress">
      <span className="text-sm font-bold">
        {done}/{steps.length}
      </span>
    </ProgressRing>
    <div className="min-w-48">
      <p className="eyebrow text-text-muted">Get started</p>
      <h2 id="home-start" className="text-base font-bold">
        {done} of {steps.length} done
      </h2>
    </div>
    <ul className="flex flex-wrap gap-2 flex-1">
      {steps.map((s) => (
        <li key={s.id}>
          <Chip tone={s.done ? 'mint' : 'neutral'} className="!h-8 !px-3">
            {s.done && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            <span className={s.done ? '' : 'text-text-secondary'}>{s.label}</span>
            <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
          </Chip>
        </li>
      ))}
    </ul>
    <Button size="sm" variant="ghost" onClick={onDismiss}>
      Hide
    </Button>
  </Card>
);
