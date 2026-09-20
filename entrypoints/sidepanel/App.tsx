import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, History, Plus, RotateCcw, Star, X } from 'lucide-react';
import { Logo } from '../../src/components/brand/Logo';
import { FocusQuickStart } from '../../src/components/focus/FocusQuickStart';
import { AddToWorkspaceMenu } from '../../src/components/workspace/AddToWorkspaceMenu';
import { CaptureToast } from '../../src/components/feedback/CaptureToast';
import { useTodayTimeline } from '../../src/components/timeline/useTodayTimeline';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { workspaceMembership } from '../../src/core/engines/workspace-membership';
import { workspaceEngine } from '../../src/core/engines/workspace-engine';
import { restoreEngine } from '../../src/core/engines/restore-engine';
import { suggestFromTabs, WorkspaceSuggestion } from '../../src/core/engines/suggest-workspace';
import { announceAdded } from '../../src/core/engines/capture-feedback';
import { buildRecap, dayBounds, describeEvent, visibleEvents } from '../../src/core/engines/timeline-replay';
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
  const { events } = useTodayTimeline();
  const [tabs, setTabs] = useState<PepperTab[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const active = sessions.find((s) => s.id === settings.activeWorkspaceId) ?? null;
  const suggestions = useMemo(() => suggestFromTabs(tabs, sessions, { dismissed }).slice(0, 2), [tabs, sessions, dismissed]);
  const recap = useMemo(() => buildRecap(events, focusSessions, dayBounds(Date.now())), [events, focusSessions]);
  const recent = useMemo(() => visibleEvents(events).slice(-8).reverse(), [events]);

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
      setNotice(`Added ${res.added} tab${res.added !== 1 ? 's' : ''} to ${res.workspace.name}`);
    } else {
      const ws = await workspaceMembership.createFromTabs(s.topic, s.tabs);
      await workspaceMembership.setActiveWorkspace(ws.id);
      setNotice(`Created ${ws.name}`);
    }
    await fetchSessions();
  };

  const addCurrentTab = async () => {
    const [current] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!current?.url) return;
    const res = await workspaceMembership.addToActiveOrInbox([
      { id: current.id, url: current.url, title: current.title || current.url, favIconUrl: current.favIconUrl || '', index: 0 },
    ]);
    if (res) {
      setNotice(res.added > 0 ? `Added to ${res.workspace.name}` : `Already in ${res.workspace.name}`);
      void announceAdded(res.workspace.name, res.added, res.skipped);
    } else {
      setNotice('This tab cannot be saved');
    }
    await fetchSessions();
  };

  const openDashboard = (hash = '') => chrome.tabs.create({ url: chrome.runtime.getURL(`manager.html${hash}`) });

  return (
    <main className="min-h-screen p-4 space-y-5 text-sm">
      <CaptureToast />

      <header className="flex items-center justify-between">
        <Logo showText size={22} />
        <button
          type="button"
          onClick={() => openDashboard()}
          aria-label="Open dashboard"
          title="Open dashboard"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover"
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      <div role="status" aria-live="polite" className="min-h-0">
        {notice && <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-500">{notice}</p>}
      </div>

      <FocusQuickStart />

      {/* Active workspace */}
      <section aria-labelledby="sp-active" className="rounded-xl border border-border bg-surface-card p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 id="sp-active" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-text-muted">
            <Star className="w-3 h-3 text-amber-700 dark:text-amber-400 fill-amber-400" aria-hidden="true" />
            Active workspace
          </h2>
          {active && (
            <button
              type="button"
              onClick={() => restoreEngine.restoreSession(active.id)}
              className="flex items-center gap-1 text-xs font-semibold text-pepper-400 hover:underline"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reopen
            </button>
          )}
        </div>
        {active ? (
          <>
            <p className="text-sm font-bold text-text-primary truncate">{active.name}</p>
            <ul className="space-y-0.5 max-h-28 overflow-y-auto">
              {active.tabs.slice(0, 30).map((t) => (
                <li key={t.url} className="truncate text-xs">
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-text-secondary hover:text-pepper-400">
                    {t.title || t.url}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-text-muted">
            None yet. Use the <strong>+</strong> next to any tab and star a workspace to make it active.
          </p>
        )}
        <button
          type="button"
          onClick={addCurrentTab}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Add current tab{active ? '' : ' to Inbox'}
        </button>
      </section>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section aria-label="Suggestions" className="space-y-2">
          {suggestions.map((s) => (
            <div key={s.key} className="rounded-xl border border-pepper-500/30 bg-pepper-500/5 p-3 space-y-2">
              <p className="text-xs text-text-primary">
                {s.kind === 'add' ? (
                  <>Add <strong>{s.tabs.length} open tabs</strong> to <strong>{s.workspaceName}</strong>?</>
                ) : (
                  <>Group <strong>{s.tabs.length} tabs</strong> about <strong>{s.topic}</strong> into a new workspace?</>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold"
                >
                  {s.kind === 'add' ? 'Add them' : 'Create workspace'}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(s.key)}
                  aria-label="Dismiss suggestion"
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Open tabs */}
      <section aria-labelledby="sp-tabs" className="space-y-1.5">
        <h2 id="sp-tabs" className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Open tabs ({tabs.length})
        </h2>
        <ul className="space-y-0.5">
          {tabs.map((t) => (
            <li key={`${t.id}-${t.url}`} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-hover">
              {t.favIconUrl ? <img src={t.favIconUrl} alt="" className="w-3.5 h-3.5 rounded shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
              <button
                type="button"
                onClick={() => t.id !== undefined && chrome.tabs.update(t.id, { active: true })}
                className="flex-1 min-w-0 truncate text-left text-xs text-text-primary"
                title={t.url}
              >
                {t.title || t.url}
              </button>
              <AddToWorkspaceMenu tabs={[t]} label={`Add ${t.title || t.url} to a workspace`} />
            </li>
          ))}
        </ul>
      </section>

      {/* Timeline */}
      <section aria-labelledby="sp-timeline" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="sp-timeline" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-text-muted">
            <History className="w-3 h-3" aria-hidden="true" />
            Today
          </h2>
          <button type="button" onClick={() => openDashboard('?view=timeline')} className="text-xs font-semibold text-pepper-400 hover:underline">
            Full timeline
          </button>
        </div>

        {!settings.sessionTrackingEnabled ? (
          <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
            <p className="text-xs text-text-secondary">
              Record a private timeline of your browser session: when you opened Chrome, which tabs you visited and for how long. It stays on this device.
            </p>
            <button
              type="button"
              onClick={() => updateSettings({ sessionTrackingEnabled: true })}
              className="px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold"
            >
              Turn on session timeline
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-text-secondary">{recap.sentence}</p>
            <ol className="space-y-1">
              {recent.length === 0 && <li className="text-xs text-text-muted">Nothing recorded yet today.</li>}
              {recent.map((e, i) => (
                <li key={`${e.ts}-${i}`} className="flex items-center gap-2 text-xs">
                  <time className="w-12 shrink-0 font-mono text-text-muted">{clock(e.ts)}</time>
                  <span className="flex-1 min-w-0 truncate text-text-primary">{describeEvent(e)}</span>
                  {e.url && (e.type === 'tab_open' || e.type === 'tab_switch' || e.type === 'tab_navigate') && (
                    <AddToWorkspaceMenu
                      tabs={[{ url: e.url, title: e.title || e.url, favIconUrl: '', index: 0 }]}
                      label={`Add ${e.title || e.url} to a workspace`}
                    />
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}
