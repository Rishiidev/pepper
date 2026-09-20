import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, FolderPlus, RotateCcw, Zap } from 'lucide-react';
import { BrowserSession, TimelineEvent } from '../../core/types/timeline';
import { FocusSession } from '../../core/types/focus-session';
import { timelineStore } from '../../core/engines/timeline-store';
import { focusEngine } from '../../core/engines/focus-engine';
import {
  buildRecap, dayBounds, describeEvent, formatDuration, tabsOpenAt, toPepperTabs, visibleEvents,
} from '../../core/engines/timeline-replay';
import { workspaceMembership } from '../../core/engines/workspace-membership';
import { generateSessionName, baseDomain } from '../../core/engines/session-naming';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import { AddToWorkspaceMenu } from '../workspace/AddToWorkspaceMenu';

const MIN = 60_000;
const EVENT_LIMIT = 200;

const clock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

/** Day view of the browser: sessions, a scrubber to see what was open at any moment, and every event. */
export const TimelineView: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { fetchSessions } = useSessionStore();
  const [day, setDay] = useState(() => dayBounds(Date.now()).from);
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [events, setEvents] = useState<Record<string, TimelineEvent[]>>({});
  const [focus, setFocus] = useState<FocusSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[sessions.length - 1] ?? null;
  const sessionEvents = selected ? events[selected.id] ?? [] : [];
  const start = selected?.startedAt ?? 0;
  const end = selected ? selected.endedAt ?? Math.max(selected.lastEventAt, Date.now()) : 0;
  const at = Math.min(Math.max(cursor ?? end, start), end);
  const running = !!selected && selected.endedAt === undefined;

  const replay = useMemo(() => (selected ? tabsOpenAt(sessionEvents, at) : null), [selected, sessionEvents, at]);
  const allDayEvents = useMemo(() => Object.values(events).flat(), [events]);
  const recap = useMemo(() => buildRecap(allDayEvents, focus, range), [allDayEvents, focus, range]);
  const rows = useMemo(() => visibleEvents(sessionEvents), [sessionEvents]);

  // 10-minute activity buckets behind the scrubber
  const buckets = useMemo(() => {
    if (!selected || end <= start) return [] as number[];
    const n = Math.min(120, Math.max(1, Math.ceil((end - start) / (10 * MIN))));
    const size = (end - start) / n;
    const b = new Array<number>(n).fill(0);
    for (const e of sessionEvents) {
      if (e.type === 'tab_active' && e.spentMs) b[Math.min(n - 1, Math.max(0, Math.floor((e.ts - start) / size)))] += e.spentMs;
    }
    return b;
  }, [selected, sessionEvents, start, end]);
  const maxBucket = Math.max(1, ...buckets);

  const reopen = async () => {
    if (!replay || replay.tabs.length === 0) return;
    await chrome.windows.create({ url: replay.tabs.map((t) => t.url), focused: true });
    setNotice(`Reopened ${replay.tabs.length} tabs from ${clock(at)}`);
  };

  const saveAsWorkspace = async () => {
    if (!replay || replay.tabs.length === 0) return;
    const tabs = toPepperTabs(replay.tabs);
    const clusters = [...new Set(tabs.map((t) => baseDomain(hostOf(t.url))))];
    try {
      const ws = await workspaceMembership.createFromTabs(generateSessionName(tabs, clusters), tabs);
      await fetchSessions();
      setNotice(`Saved ${ws.tabCount} tabs as “${ws.name}”`);
    } catch {
      setNotice('Nothing to save at that moment');
    }
  };

  if (!settings.sessionTrackingEnabled && sessions.length === 0) {
    return (
      <section aria-labelledby="tl-title" className="rounded-2xl border border-dashed border-border bg-surface-card/40 p-8 text-center space-y-4">
        <Clock className="w-8 h-8 text-pepper-400 mx-auto" aria-hidden="true" />
        <h2 id="tl-title" className="text-base font-bold text-text-primary">See your browser day as a timeline</h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          Pepper can record when you opened Chrome, every tab you opened, closed or visited, and how long you actually spent on each.
          Then scrub back to any moment and pull tabs into a workspace. It is off by default, stays on this device, skips incognito,
          and you choose which sites are never recorded.
        </p>
        <button
          type="button"
          onClick={() => updateSettings({ sessionTrackingEnabled: true })}
          className="px-5 py-2.5 rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold"
        >
          Turn on session timeline
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="tl-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tl-title" className="text-base font-bold text-text-primary">Timeline</h2>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous day" onClick={() => setDay(dayBounds(range.from - 1).from)} className="p-1.5 rounded-lg border border-border hover:bg-surface-hover">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <input
            type="date"
            aria-label="Day"
            value={dateInput(day)}
            max={dateInput(Date.now())}
            onChange={(e) => e.target.value && setDay(dayBounds(new Date(`${e.target.value}T12:00:00`).getTime()).from)}
            className="bg-surface-card border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
          />
          <button type="button" aria-label="Next day" disabled={isToday} onClick={() => setDay(dayBounds(range.to).from)} className="p-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          {!isToday && (
            <button type="button" onClick={() => setDay(dayBounds(Date.now()).from)} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-pepper-400 hover:bg-pepper-500/10">
              Today
            </button>
          )}
        </div>
      </div>

      <div role="status" aria-live="polite">
        {notice && <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-500">{notice}</p>}
      </div>

      {/* Recap */}
      <div className="rounded-2xl border border-border bg-surface-card p-5 space-y-3">
        <p className="text-sm font-semibold text-text-primary">{recap.sentence}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            ['Active', formatDuration(recap.activeMs)],
            ['Focus', formatDuration(recap.focusSeconds * 1000)],
            ['Tabs opened', String(recap.tabsOpened)],
            ['Away', formatDuration(recap.awayMs)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-text-muted">{k}</dt>
              <dd className="font-bold text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        {recap.topDomains.length > 0 && (
          <ul className="space-y-1" aria-label="Time by site">
            {recap.topDomains.map((d) => (
              <li key={d.domain} className="flex items-center gap-2 text-xs">
                <span className="w-28 truncate text-text-secondary">{d.label}</span>
                <span className="flex-1 h-1.5 rounded-full bg-border/60 overflow-hidden" aria-hidden="true">
                  <span className="block h-full bg-pepper-500" style={{ width: `${Math.max(4, (d.ms / recap.topDomains[0].ms) * 100)}%` }} />
                </span>
                <span className="w-14 text-right font-mono text-text-muted">{formatDuration(d.ms)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-text-muted">No browser session recorded on this day.</p>
      ) : (
        <>
          {/* Session chips */}
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isSel ? 'border-pepper-500 bg-pepper-500/10 text-pepper-400' : 'border-border text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {clock(s.startedAt)} – {s.endedAt ? clock(s.endedAt) : 'now'}
                  {s.endReason === 'interrupted' && (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                      Interrupted
                    </span>
                  )}
                  {!s.endedAt && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-label="Recording" />}
                </button>
              );
            })}
          </div>

          {selected && replay && (
            <>
              {/* Scrubber */}
              <div className="rounded-2xl border border-border bg-surface-card p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-text-muted">{clock(start)}</span>
                  <span className="font-bold text-pepper-400" aria-live="polite">
                    {clock(at)}{running && at >= end - MIN ? ' (now)' : ''}
                  </span>
                  <span className="font-mono text-text-muted">{selected.endedAt ? clock(end) : 'now'}</span>
                </div>
                <svg viewBox={`0 0 ${Math.max(1, buckets.length)} 24`} preserveAspectRatio="none" className="w-full h-10" aria-hidden="true">
                  {buckets.map((b, i) => (
                    <rect key={i} x={i + 0.1} width={0.8} y={24 - (b / maxBucket) * 22 - 1} height={(b / maxBucket) * 22 + 1} className="fill-pepper-500/50" />
                  ))}
                  <rect x={((at - start) / Math.max(1, end - start)) * buckets.length} width={0.25} y={0} height={24} className="fill-pepper-500" />
                </svg>
                <input
                  type="range"
                  aria-label="Scrub through this browser session"
                  aria-valuetext={`${clock(at)}, ${replay.tabs.length} tabs open`}
                  min={0}
                  max={Math.max(1, Math.round((end - start) / MIN))}
                  value={Math.round((at - start) / MIN)}
                  onChange={(e) => setCursor(start + Number(e.target.value) * MIN)}
                  className="w-full accent-pepper-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-text-secondary">
                    <strong className="text-text-primary">{replay.tabs.length}</strong> tab{replay.tabs.length !== 1 ? 's' : ''} open at {clock(at)}
                    {replay.idle && <span className="text-amber-500"> · you were away</span>}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={reopen} disabled={replay.tabs.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold disabled:opacity-50">
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Reopen this moment
                    </button>
                    <button type="button" onClick={saveAsWorkspace} disabled={replay.tabs.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover disabled:opacity-50">
                      <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      Save as workspace
                    </button>
                  </div>
                </div>

                <ul className="divide-y divide-border/60" aria-label={`Tabs open at ${clock(at)}`}>
                  {replay.tabs.map((t) => (
                    <li key={t.tabId} className="flex items-center gap-3 py-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.tabId === replay.activeTabId ? 'bg-pepper-500' : 'bg-border'}`} aria-label={t.tabId === replay.activeTabId ? 'Active tab' : undefined} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-text-primary">{t.title}</p>
                        <p className="truncate text-xs text-text-muted">{hostOf(t.url)} · open {formatDuration(at - t.openedAt)}</p>
                      </div>
                      <AddToWorkspaceMenu tabs={[{ url: t.url, title: t.title, favIconUrl: '', index: 0 }]} label={`Add ${t.title} to a workspace`} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Event list */}
              <div className="rounded-2xl border border-border bg-surface-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Everything that happened</h3>
                <ol className="space-y-0.5">
                  {(showAll ? rows : rows.slice(0, EVENT_LIMIT)).map((e, i) => (
                    <li key={`${e.ts}-${e.id ?? i}`} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCursor(e.ts)}
                        aria-label={`${clock(e.ts)}, ${describeEvent(e)}. Jump to this moment`}
                        className={`flex-1 min-w-0 flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-surface-hover ${Math.abs(e.ts - at) < MIN / 2 ? 'bg-pepper-500/10' : ''}`}
                      >
                        <time className="w-16 shrink-0 font-mono text-xs text-text-muted">{clock(e.ts)}</time>
                        {(e.type === 'session_start' || e.type === 'session_end') && <Zap className="w-3 h-3 text-pepper-400 shrink-0" aria-hidden="true" />}
                        <span className="truncate text-xs text-text-primary">{describeEvent(e)}</span>
                      </button>
                      {e.url && ['tab_open', 'tab_switch', 'tab_navigate'].includes(e.type) && (
                        <AddToWorkspaceMenu tabs={[{ url: e.url, title: e.title || e.url, favIconUrl: '', index: 0 }]} label={`Add ${e.title || e.url} to a workspace`} />
                      )}
                    </li>
                  ))}
                </ol>
                {!showAll && rows.length > EVENT_LIMIT && (
                  <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-xs font-semibold text-pepper-400 hover:underline">
                    Show all {rows.length} events
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};
