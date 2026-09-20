import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Check, FolderPlus, RotateCcw } from 'lucide-react';
import { BrowserSession, TimelineEvent } from '../../core/types/timeline';
import { FocusSession } from '../../core/types/focus-session';
import { timelineStore } from '../../core/engines/timeline-store';
import { focusEngine } from '../../core/engines/focus-engine';
import { buildRecap, dayBounds, describeEvent, formatDuration, formatDurationCompact, groupByHour, tabsOpenAt, toPepperTabs, visibleEvents } from '../../core/engines/timeline-replay';
import { workspaceMembership } from '../../core/engines/workspace-membership';
import { generateSessionName, baseDomain } from '../../core/engines/session-naming';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import { recordActivation } from '../../core/engines/activation';
import { AddToWorkspaceMenu } from '../workspace/AddToWorkspaceMenu';
import { Button, Card, CardHeader, Chip, IconButton, Segmented, Stat, toast } from '../ui';
import { TimeAxis } from './TimeAxis';
import { HistoryView } from '../history/HistoryView';
import { InsightsDashboard } from '../insights/InsightsDashboard';

const MIN = 60_000;
const EVENT_LIMIT = 200;

const clock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const hourHeading = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric' });
const dateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

type Sub = 'day' | 'history' | 'insights';

/** Timeline: one place for the day view, history and insights. */
export const TimelineView: React.FC = () => {
  const [sub, setSub] = useState<Sub>('day');
  return (
    <section aria-labelledby="tl-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="tl-title" className="text-[28px] font-bold leading-tight">
          Timeline
        </h1>
        <Segmented<Sub>
          label="Timeline view"
          value={sub}
          onChange={setSub}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'history', label: 'History' },
            { value: 'insights', label: 'Insights' },
          ]}
        />
      </div>
      {sub === 'day' && <DayView />}
      {sub === 'history' && <HistoryView />}
      {sub === 'insights' && <InsightsDashboard />}
    </section>
  );
};

const DayView: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { fetchSessions } = useSessionStore();
  const [day, setDay] = useState(() => dayBounds(Date.now()).from);
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [events, setEvents] = useState<Record<string, TimelineEvent[]>>({});
  const [focus, setFocus] = useState<FocusSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const range = useMemo(() => dayBounds(day), [day]);
  const isToday = range.from === dayBounds(Date.now()).from;

  const load = useCallback(async () => {
    const list = await timelineStore.getSessionsBetween(range.from, range.to);
    const map: Record<string, TimelineEvent[]> = {};
    for (const s of list) map[s.id] = await timelineStore.getEvents(s.id);
    setSessions(list);
    setEvents(map);
    setFocus(await focusEngine.getAllSessions());
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.pepper_timeline_updated) void load();
    };
    chrome.storage?.onChanged.addListener(onChanged);
    return () => {
      clearInterval(timer);
      chrome.storage?.onChanged.removeListener(onChanged);
    };
  }, [load]);

  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[sessions.length - 1] ?? null;
  const sessionEvents = selected ? events[selected.id] ?? [] : [];
  const start = selected?.startedAt ?? 0;
  const end = selected ? selected.endedAt ?? Math.max(selected.lastEventAt, Date.now()) : 0;
  const at = Math.min(Math.max(cursor ?? end, start), end);
  const running = !!selected && selected.endedAt === undefined;

  const replay = useMemo(() => (selected ? tabsOpenAt(sessionEvents, at) : null), [selected, sessionEvents, at]);
  const recap = useMemo(() => buildRecap(Object.values(events).flat(), focus, range), [events, focus, range]);
  const rows = useMemo(() => visibleEvents(sessionEvents), [sessionEvents]);
  const groups = useMemo(() => groupByHour(showAll ? rows : rows.slice(0, EVENT_LIMIT)), [rows, showAll]);

  const currentTs = useMemo(() => rows.reduce((best, e) => (e.ts <= at && e.ts >= best ? e.ts : best), -1), [rows, at]);

  const buckets = useMemo(() => {
    if (!selected || end <= start) return [] as number[];
    const n = Math.min(96, Math.max(24, Math.ceil((end - start) / (5 * MIN))));
    const size = (end - start) / n;
    const b = new Array<number>(n).fill(0);
    for (const e of sessionEvents) {
      if (e.type === 'tab_active' && e.spentMs) b[Math.min(n - 1, Math.max(0, Math.floor((e.ts - start) / size)))] += e.spentMs;
    }
    return b;
  }, [selected, sessionEvents, start, end]);

  const reopen = async () => {
    if (!replay || replay.tabs.length === 0) return;
    await chrome.windows.create({ url: replay.tabs.map((t) => t.url), focused: true });
    toast(`Reopened ${replay.tabs.length} tabs from ${clock(at)}`);
  };

  const saveAsWorkspace = async () => {
    if (!replay || replay.tabs.length === 0) return;
    const tabs = toPepperTabs(replay.tabs);
    const clusters = [...new Set(tabs.map((t) => baseDomain(hostOf(t.url))))];
    try {
      const ws = await workspaceMembership.createFromTabs(generateSessionName(tabs, clusters), tabs);
      await fetchSessions();
      toast(`Saved ${ws.tabCount} tabs as “${ws.name}”`);
    } catch {
      toast('Nothing to save at that moment');
    }
  };

  const enable = async () => {
    await updateSettings({ sessionTrackingEnabled: true });
    void recordActivation('timeline');
  };

  if (!settings.sessionTrackingEnabled && sessions.length === 0) {
    return (
      <Card tone="lilac" className="max-w-2xl space-y-4">
        <CardHeader eyebrow="Session timeline" title="See your browser day" />
        <p className="text-sm">Scrub back to any moment and pull tabs into a workspace. You decide what is recorded.</p>
        <ul className="space-y-2 text-sm">
          {['Stays on this device. Nothing is uploaded.', 'Skips incognito, and you can block any site.', 'Off by default. Turn it off any time.'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
        <Button variant="primary" onClick={enable}>
          Turn on session timeline
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-1.5">
        <IconButton aria-label="Previous day" onClick={() => setDay(dayBounds(range.from - 1).from)}>
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </IconButton>
        <input
          type="date"
          aria-label="Day"
          value={dateInput(day)}
          max={dateInput(Date.now())}
          onChange={(e) => e.target.value && setDay(dayBounds(new Date(`${e.target.value}T12:00:00`).getTime()).from)}
          className="h-9 rounded-input border bg-surface-card px-2 text-sm"
          style={{ borderColor: 'var(--pp-border-strong)' }}
        />
        <IconButton aria-label="Next day" disabled={isToday} onClick={() => setDay(dayBounds(range.to).from)}>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </IconButton>
        {!isToday && (
          <Button size="sm" variant="ghost" onClick={() => setDay(dayBounds(Date.now()).from)}>
            Today
          </Button>
        )}
      </div>

      {/* Recap */}
      <Card tone="lilac" className="space-y-4">
        <p className="text-xl font-bold leading-snug">{recap.sentence}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat size="md" label="Active" value={formatDurationCompact(recap.activeMs)} />
          <Stat size="md" label="Focus" value={formatDurationCompact(recap.focusSeconds * 1000)} />
          <Stat size="md" label="Tabs opened" value={String(recap.tabsOpened)} />
          <Stat size="md" label="Away" value={formatDurationCompact(recap.awayMs)} />
        </dl>
        {recap.topDomains.length > 0 && (
          <ul className="space-y-1.5" aria-label="Time by site">
            {recap.topDomains.map((d) => (
              <li key={d.domain} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate">{d.label}</span>
                <span className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded-full bg-zone-lilac-accent" style={{ width: `${Math.max(4, (d.ms / recap.topDomains[0].ms) * 100)}%` }} />
                </span>
                <span className="w-14 text-right font-mono text-xs">{formatDurationCompact(d.ms)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sessions.length === 0 ? (
        <p className="text-sm text-text-muted">No browser session recorded on this day.</p>
      ) : (
        <>
          {/* Day axis with session bands */}
          <Card className="space-y-3">
            <CardHeader eyebrow="Sessions" title={`${sessions.length} time${sessions.length !== 1 ? 's' : ''} you had Chrome open`} />
            <TimeAxis
              from={range.from}
              to={range.to}
              cursor={cursor ?? undefined}
              bands={sessions.map((s) => ({ id: s.id, from: s.startedAt, to: s.endedAt ?? Math.max(s.lastEventAt, Date.now()), label: clock(s.startedAt), selected: s.id === selected?.id, interrupted: s.endReason === 'interrupted' }))}
              onSelectBand={(id) => {
                setSelectedId(id);
                setCursor(null);
              }}
            />
            <div role="tablist" aria-label="Browser sessions" className="flex flex-wrap gap-2">
              {sessions.map((s) => {
                const isSel = s.id === selected?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={isSel}
                    onClick={() => {
                      setSelectedId(s.id);
                      setCursor(null);
                    }}
                    className={`inline-flex h-8 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold ${isSel ? 'bg-text-primary text-surface-card border-transparent' : 'border-border-strong hover:bg-surface-hover'}`}
                    style={isSel ? undefined : { borderColor: 'var(--pp-border-strong)' }}
                  >
                    {clock(s.startedAt)} – {s.endedAt ? clock(s.endedAt) : 'now'}
                    {s.endReason === 'interrupted' && (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        Interrupted
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {selected && replay && (
            <>
              <Card className="space-y-4">
                <CardHeader eyebrow="Scrub" title={`${replay.tabs.length} tab${replay.tabs.length !== 1 ? 's' : ''} open at ${clock(at)}${running && at >= end - MIN ? ' (now)' : ''}`} />
                <TimeAxis from={start} to={Math.max(end, start + MIN)} bars={buckets} cursor={at} />
                <input
                  type="range"
                  aria-label="Scrub through this browser session"
                  aria-valuetext={`${clock(at)}, ${replay.tabs.length} tabs open`}
                  min={0}
                  max={Math.max(1, Math.round((end - start) / MIN))}
                  value={Math.round((at - start) / MIN)}
                  onChange={(e) => setCursor(start + Number(e.target.value) * MIN)}
                  className="w-full accent-current"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {replay.idle && <Chip tone="butter">You were away</Chip>}
                  <span className="flex-1" />
                  <Button variant="primary" onClick={reopen} disabled={replay.tabs.length === 0}>
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    Reopen this moment
                  </Button>
                  <Button onClick={saveAsWorkspace} disabled={replay.tabs.length === 0}>
                    <FolderPlus className="w-4 h-4" aria-hidden="true" />
                    Save as workspace
                  </Button>
                </div>
                <ul className="divide-y divide-border" aria-label={`Tabs open at ${clock(at)}`}>
                  {replay.tabs.map((t) => (
                    <li key={t.tabId} className="flex items-center gap-3 py-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${t.tabId === replay.activeTabId ? 'bg-text-primary' : 'bg-border-strong'}`} style={t.tabId === replay.activeTabId ? undefined : { background: 'var(--pp-border-strong)' }} aria-label={t.tabId === replay.activeTabId ? 'Active tab' : undefined} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{t.title}</p>
                        <p className="truncate text-xs text-text-muted">
                          {hostOf(t.url)} · open {formatDuration(at - t.openedAt)}
                        </p>
                      </div>
                      <AddToWorkspaceMenu tabs={[{ url: t.url, title: t.title, favIconUrl: '', index: 0 }]} label={`Add ${t.title} to a workspace`} />
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3">
                <CardHeader eyebrow="Log" title="Everything that happened" />
                <div>
                  {groups.map((g) => (
                    <section key={g.hourStart} aria-label={`Events at ${hourHeading(g.hourStart)}`}>
                      <h3 className="sticky top-0 z-10 bg-surface-card py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">{hourHeading(g.hourStart)}</h3>
                      <ol className="space-y-0.5">
                        {g.events.map((e, i) => (
                          <li key={`${e.ts}-${e.id ?? i}`} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCursor(e.ts)}
                              aria-label={`${clock(e.ts)}, ${describeEvent(e)}. Jump to this moment`}
                              className={`flex-1 min-w-0 flex items-center gap-3 rounded-input px-2 py-1.5 text-left hover:bg-surface-hover ${e.ts === currentTs ? 'bg-surface-active' : ''}`}
                            >
                              <time className="w-16 shrink-0 font-mono text-xs text-text-muted">{clock(e.ts)}</time>
                              <span className="truncate text-sm">{describeEvent(e)}</span>
                              {e.type === 'session_end' && e.reason === 'interrupted' && <Chip tone="butter">Interrupted</Chip>}
                            </button>
                            {e.url && ['tab_open', 'tab_switch', 'tab_navigate'].includes(e.type) && (
                              <AddToWorkspaceMenu tabs={[{ url: e.url, title: e.title || e.url, favIconUrl: '', index: 0 }]} label={`Add ${e.title || e.url} to a workspace`} />
                            )}
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
                {!showAll && rows.length > EVENT_LIMIT && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAll(true)}>
                    Show all {rows.length} events
                  </Button>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};
