import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronUp, LayoutGrid, PanelRight, Settings, Star, Undo2 } from 'lucide-react';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { Logo } from '../../src/components/brand/Logo';
import { DomainTabAccordion } from '../../src/components/popup/DomainTabAccordion';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { RecoveryBanner } from '../../src/components/recovery/RecoveryBanner';
import { InlineRename } from '../../src/components/feedback/InlineRename';
import { ThemeToggle } from '../../src/components/settings/ThemeToggle';
import { FocusQuickStart } from '../../src/components/focus/FocusQuickStart';
import { TasksCard } from '../../src/components/tasks/TasksCard';
import { AddToWorkspaceMenu } from '../../src/components/workspace/AddToWorkspaceMenu';
import { Button, IconButton, Card, CardHeader, FaviconStack, Kbd, Switch, ToastHost, toast } from '../../src/components/ui';
import { workspaceEngine } from '../../src/core/engines/workspace-engine';
import { sessionEngine } from '../../src/core/engines/session-engine';
import { restoreEngine } from '../../src/core/engines/restore-engine';
import { recoveryEngine, LastClosed } from '../../src/core/engines/recovery-engine';
import { workspaceMembership } from '../../src/core/engines/workspace-membership';
import { generateSessionName, baseDomain } from '../../src/core/engines/session-naming';
import { featureFlagsManager } from '../../src/core/intelligence';
import { AutoTitleSkill } from '../../src/core/intelligence/skills/auto-title';
import { projectRepo } from '../../src/storage/repositories/project-repo';
import { recordActivation } from '../../src/core/engines/activation';
import { PepperTab, PepperSession } from '../../src/core/types/session';
import { PepperProjectEntity } from '../../src/storage/db';

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const ago = (ts: number) => {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default function App() {
  const { fetchSessions } = useSessionStore();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();

  const [view, setView] = useState<'main' | 'settings'>('main');
  const [tabs, setTabs] = useState<PepperTab[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState('');
  const nameEdited = useRef(false);
  const [project, setProject] = useState('General');
  const [projects, setProjects] = useState<PepperProjectEntity[]>([]);
  const [tags, setTags] = useState('');
  const [chooseOpen, setChooseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<PepperSession | null>(null);
  const [lastClosed, setLastClosed] = useState<LastClosed | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Latest values for the keyboard handler
  const latest = useRef({ save: () => {}, canSave: false });

  useEffect(() => {
    void fetchSessions();
    void fetchSettings();
    void load();
    recoveryEngine.peekLastClosed().then(setLastClosed).catch(() => setLastClosed(null));
    workspaceMembership.getActiveWorkspace().then((w) => setActiveName(w?.name ?? null)).catch(() => undefined);

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable;
      if (((e.metaKey || e.ctrlKey) && e.key === 's') || (e.key === 'Enter' && !typing && !e.metaKey)) {
        e.preventDefault();
        if (latest.current.canSave) latest.current.save();
      } else if (e.key === 'Escape' && !typing) {
        window.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function load() {
    const current = await workspaceEngine.getActiveWindowTabs();
    setTabs(current);
    setSelected(new Set(current.map((_, i) => i)));

    const projs = await projectRepo.getAll();
    setProjects(projs);
    const domains = current.map((t) => hostOf(t.url));
    setProject(projs.find((p) => domains.some((d) => d.toLowerCase().includes(p.name.toLowerCase())))?.name ?? 'General');

    // Instant local name; an AI title replaces it only if AI is on and the user has not typed one
    const clusters = [...new Set(domains.filter(Boolean).map(baseDomain))];
    if (current.length > 0) setName(generateSessionName(current, clusters));
    await featureFlagsManager.hydrateFromStorage();
    if (featureFlagsManager.isEnabled('aiEnabled') && current.length > 0) {
      const skill = new AutoTitleSkill();
      skill
        .execute({ id: `popup_title_${Date.now()}`, skillId: skill.id, priority: 'HIGH', requirements: skill.requirements, input: current, context: { traceId: `popup_${Date.now()}`, createdAt: Date.now() } })
        .then((res) => {
          if (res.success && typeof res.data === 'string' && !nameEdited.current) setName(res.data);
        })
        .catch(() => undefined);
    }
  }

  const chosen = tabs.filter((_, i) => selected.has(i));

  async function save() {
    if (chosen.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const session = await workspaceEngine.saveWorkspace(name.trim() || 'Saved workspace', chosen, project, settings.closeTabsOnSave);
      if (!session) throw new Error('nothing saved');
      const parsed = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (parsed.length > 0) await sessionEngine.updateSession(session.id, { tags: parsed });
      setSaved(session);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Could not save this window. Your tabs are still open.');
    } finally {
      setSaving(false);
    }
  }
  latest.current = { save: () => void save(), canSave: view === 'main' && !saved && chosen.length > 0 && !saving };

  const undo = async () => {
    if (!saved) return;
    await restoreEngine.restoreSession(saved.id);
    await sessionEngine.deleteSession(saved.id);
    window.close();
  };

  const reopen = async () => {
    try {
      const target = await recoveryEngine.reopenLastClosedWindow();
      // Pepper snapshots are counted by the restore engine; Chrome's own restore is counted here
      if (target?.source === 'chrome') void recordActivation('restore');
      window.close();
    } catch {
      toast('Could not reopen that window');
    }
  };

  const openDashboard = () => chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
  const openSidePanel = async () => {
    try {
      const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
      if (win.id !== undefined) await chrome.sidePanel.open({ windowId: win.id });
      window.close();
    } catch (err) {
      console.warn('Side panel unavailable:', err);
    }
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };
  const toggleMany = (idx: number[], on: boolean) => {
    const next = new Set(selected);
    idx.forEach((i) => (on ? next.add(i) : next.delete(i)));
    setSelected(next);
  };

  const header = (
    <header className="flex items-center justify-between">
      <Logo showText size={22} />
      <div className="flex items-center gap-1 -mr-2">
        <IconButton aria-label="Open side panel" title="Open side panel" onClick={openSidePanel}>
          <PanelRight className="w-4 h-4" aria-hidden="true" />
        </IconButton>
        <IconButton aria-label="Open dashboard" title="Open dashboard" onClick={openDashboard}>
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
        </IconButton>
        <IconButton aria-label="Settings" title="Settings" onClick={() => setView('settings')}>
          <Settings className="w-4 h-4" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );

  if (view === 'settings') {
    return (
      <div className="w-[400px] p-4 space-y-4 bg-surface text-text-primary">
        <ToastHost />
        <header className="flex items-center gap-2">
          <IconButton aria-label="Back" onClick={() => setView('main')}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </IconButton>
          <h1 className="text-lg font-bold">Settings</h1>
        </header>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold">Theme</span>
            <ThemeToggle />
          </div>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold">Close tabs after saving</span>
              <span className="block text-xs text-text-muted">Frees memory right away</span>
            </span>
            <Switch checked={settings.closeTabsOnSave} onChange={(v) => updateSettings({ closeTabsOnSave: v })} label="Close tabs after saving" />
          </label>
          <Button className="w-full" onClick={openDashboard}>
            All settings in the dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-[400px] p-4 space-y-4 bg-surface text-text-primary">
      <CommandPalette />
      <ToastHost />
      {header}

      {/* Save this window */}
      <Card tone="ink" pad="sm" as="section" aria-label="Save this window" className="space-y-4" data-testid="save-card">
        {saved ? (
          <>
            <CardHeader eyebrow="Saved" title={`${saved.tabCount} tabs are safe`} icon={<Check className="w-4 h-4" />} />
            <InlineRename value={saved.name} autoFocus={false} label="Rename saved workspace" className="text-base" onSave={async (n) => setSaved(await sessionEngine.updateSession(saved.id, { name: n }))} />
            <div className="flex gap-2">
              <Button onClick={undo} className="flex-1">
                <Undo2 className="w-4 h-4" aria-hidden="true" />
                Undo
              </Button>
              <Button variant="ghost" onClick={() => window.close()} className="flex-1">
                Done
              </Button>
            </div>
          </>
        ) : tabs.length === 0 ? (
          <div className="py-4">
            <p className="text-base font-bold">No web tabs to save</p>
            <p className="text-sm opacity-80 mt-1">Open a page, then come back. Closing a window saves it automatically.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow opacity-75">This window</p>
                <p className="display-number !text-[32px] mt-1">
                  {chosen.length} tab{chosen.length !== 1 ? 's' : ''}
                </p>
              </div>
              <FaviconStack items={chosen} max={5} ring="var(--pp-ink-bg)" total={chosen.length} />
            </div>

            <InlineRename
              value={name}
              label="Workspace name"
              className="text-sm w-full"
              onSave={async (n) => {
                nameEdited.current = true;
                setName(n);
              }}
            />

            <Button variant="primary" className="w-full" disabled={saving || chosen.length === 0} onClick={() => void save()} data-testid="save-window">
              {saving ? 'Saving…' : 'Save window'}
              <Kbd className="!text-white !border-white/60">⌘S</Kbd>
            </Button>
            {error && (
              <p role="alert" className="text-sm font-semibold text-pepper-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                aria-expanded={chooseOpen}
                onClick={() => setChooseOpen(!chooseOpen)}
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                Choose tabs
                {chooseOpen ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
              </button>
              <label className="inline-flex items-center gap-2">
                <span className="text-xs opacity-80">Close tabs after saving</span>
                <Switch onInk checked={settings.closeTabsOnSave} onChange={(v) => updateSettings({ closeTabsOnSave: v })} label="Close tabs after saving" />
              </label>
            </div>

            {chooseOpen && (
              <div className="space-y-3 rounded-inner bg-surface-card text-text-primary p-3">
                <div className="max-h-44 overflow-y-auto pr-1">
                  <DomainTabAccordion
                    tabs={tabs}
                    selectedIndices={selected}
                    onToggleIndex={toggle}
                    onToggleDomain={toggleMany}
                    renderRowAction={(tab) => <AddToWorkspaceMenu tabs={[tab]} label={`Add ${tab.title || tab.url} to a workspace`} />}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold space-y-1">
                    Project
                    <select value={project} onChange={(e) => setProject(e.target.value)} className="h-9 w-full rounded-input border bg-surface-card px-2 text-sm font-normal" style={{ borderColor: 'var(--pp-border-strong)' }}>
                      <option value="General">General</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold space-y-1">
                    Tags
                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="research, checkout" className="h-9 w-full rounded-input border bg-surface-card px-2 text-sm font-normal" style={{ borderColor: 'var(--pp-border-strong)' }} />
                  </label>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Recovery, or reopen the last closed window */}
      <RecoveryBanner compact />
      {lastClosed && (
        <Card tone="butter" pad="sm" as="section" aria-label="Reopen last closed window" data-testid="reopen-card">
          <button type="button" onClick={reopen} className="flex w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Reopen last closed window</span>
              <span className="block text-xs opacity-80 truncate">
                {lastClosed.tabCount} tab{lastClosed.tabCount !== 1 ? 's' : ''} · {ago(lastClosed.closedAt)} · {lastClosed.label}
              </span>
            </span>
            <span aria-hidden="true" className="inline-flex h-8 items-center rounded-full border border-current/40 px-3.5 text-xs font-semibold">
              Reopen
            </span>
          </button>
        </Card>
      )}

      <FocusQuickStart compact />
      <TasksCard />

      <footer className="flex items-center justify-between gap-2 px-2 pt-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Star className={`w-3.5 h-3.5 shrink-0 ${activeName ? 'fill-current' : ''}`} aria-hidden="true" />
          <span className="truncate">{activeName ? `Active: ${activeName}` : 'No active workspace'}</span>
        </span>
        <span className="shrink-0">
          <Kbd>⌘K</Kbd> search
        </span>
      </footer>
      {saved && <p className="sr-only" role="status">Saved {saved.tabCount} tabs</p>}
    </div>
  );
}
