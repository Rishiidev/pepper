import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { useCommandStore } from '../../src/stores/command-store';
import { Logo } from '../../src/components/brand/Logo';
import { RamBadge } from '../../src/components/brand/RamBadge';
import { DomainTabAccordion } from '../../src/components/popup/DomainTabAccordion';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { workspaceEngine } from '../../src/core/engines/workspace-engine';
import { AutoTitleSkill } from '../../src/core/intelligence/skills/auto-title';
import { projectRepo } from '../../src/storage/repositories/project-repo';
import { PepperTab, PepperSession } from '../../src/core/types/session';
import { PepperProjectEntity } from '../../src/storage/db';
import {
  Settings,
  LayoutGrid,
  Save,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

export default function App() {
  const { fetchSessions, filteredSessions, restoreSession } = useSessionStore();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { openPalette } = useCommandStore();

  const [view, setView] = useState<'save' | 'settings' | 'success'>('save');
  const [tabs, setTabs] = useState<PepperTab[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // AI & Project State
  const [aiTitle, setAiTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [detectedProject, setDetectedProject] = useState<string>('General');
  const [projectsList, setProjectsList] = useState<PepperProjectEntity[]>([]);

  // Advanced Drawer
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customTags, setCustomTags] = useState<string>('checkout, research');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<PepperSession | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchSettings();
    loadCurrentTabsAndAI();

    // Keyboard Navigation Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        window.close();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        generateAiTitle(tabs);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCurrentTabsAndAI = async () => {
    const current = await workspaceEngine.getActiveWindowTabs();
    setTabs(current);
    setSelectedIndices(new Set(current.map((_, i) => i)));

    // Load custom projects
    const projs = await projectRepo.getAll();
    setProjectsList(projs);

    // Auto-detect project based on domains
    const domains = current.map((t) => {
      try {
        return new URL(t.url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    });

    let bestMatch = projs.length > 0 ? projs[0].name : 'General';
    for (const p of projs) {
      if (domains.some((d) => d.toLowerCase().includes(p.name.toLowerCase()))) {
        bestMatch = p.name;
        break;
      }
    }
    setDetectedProject(bestMatch);

    // Auto-trigger AI title generation
    generateAiTitle(current);
  };

  const generateAiTitle = async (currentTabs: PepperTab[]) => {
    if (currentTabs.length === 0) return;
    setIsGeneratingTitle(true);
    try {
      const skill = new AutoTitleSkill();
      const res = await skill.execute({
        id: `task_popup_title_${Date.now()}`,
        skillId: skill.id,
        priority: 'HIGH',
        requirements: skill.requirements,
        input: currentTabs,
        context: { traceId: `popup_${Date.now()}`, createdAt: Date.now() },
      });

      if (res.success && res.data && typeof res.data === 'string') {
        setAiTitle(res.data);
      } else {
        setAiTitle('Active Workspace');
      }
    } catch {
      setAiTitle('Active Workspace');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSave = async () => {
    if (selectedIndices.size === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const selectedTabs = tabs.filter((_, idx) => selectedIndices.has(idx));
      const titleToUse = aiTitle.trim() || 'Saved Workspace';
      const session = await workspaceEngine.saveWorkspace(titleToUse, selectedTabs);

      if (session) {
        setLastSaved(session);
        setView('success');
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleIndex = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const handleToggleDomain = (indices: number[], select: boolean) => {
    const next = new Set(selectedIndices);
    indices.forEach((i) => {
      if (select) next.add(i);
      else next.delete(i);
    });
    setSelectedIndices(next);
  };

  const handleToggleAll = () => {
    if (selectedIndices.size === tabs.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(tabs.map((_, i) => i)));
    }
  };

  const openManager = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
    } else {
      window.open('/manager.html', '_blank');
    }
  };

  const estimatedRamMb = Math.round(selectedIndices.size * 125);
  const domainCount = new Set(
    tabs.map((t) => {
      try {
        return new URL(t.url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    }).filter(Boolean)
  ).size;

  return (
    <div className="w-[400px] bg-surface text-text-primary p-4.5 min-h-[500px] flex flex-col font-sans select-none relative">
      <CommandPalette />

      {/* Save View */}
      {view === 'save' && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Logo size={22} />
              <div>
                <span className="font-bold text-base tracking-tight text-text-primary">PEPPER</span>
                <span className="ml-1.5 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
                  Save OS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <RamBadge mbSaved={estimatedRamMb} />
              <button
                onClick={() => setView('settings')}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={openManager}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
                title="Open Manager"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Smart Header Intelligence Summary Strip */}
          <div className="bg-surface-card border border-pepper-500/30 rounded-xl p-3 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-text-muted font-medium block">Tabs</span>
              <span className="font-bold text-text-primary">{selectedIndices.size} Selected</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted font-medium block">RAM</span>
              <span className="font-bold text-emerald-400">~{estimatedRamMb} MB</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted font-medium block">Domains</span>
              <span className="font-bold text-pepper-400">{domainCount} Sites</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted font-medium block">Restore</span>
              <span className="font-bold text-blue-400">&lt; 1 sec</span>
            </div>
          </div>

          {/* Auto-Populated AI Workspace Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pepper-400" />
                <span>AI Suggested Workspace Name</span>
              </label>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => generateAiTitle(tabs)}
                  disabled={isGeneratingTitle}
                  className="p-1 text-text-muted hover:text-pepper-400 transition-colors"
                  title="Regenerate Title (⌘R)"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingTitle ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(!isEditingTitle)}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Edit Title"
                >
                  {isEditingTitle ? <Check className="w-3 h-3 text-emerald-400" /> : <Edit2 className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={aiTitle}
                onChange={(e) => {
                  setAiTitle(e.target.value);
                  setIsEditingTitle(true);
                }}
                disabled={isGeneratingTitle && !isEditingTitle}
                placeholder={isGeneratingTitle ? '✨ Analyzing tabs & generating title...' : 'e.g. Shopify Checkout'}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary placeholder:text-pepper-400/70 focus:outline-none focus:border-pepper-500 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Smart Project Detection */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-card border border-border text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pepper-500" />
              <span className="text-text-muted font-medium">Assigned Project:</span>
              <span className="font-bold text-pepper-400">{detectedProject}</span>
            </div>

            {projectsList.length > 0 && (
              <select
                value={detectedProject}
                onChange={(e) => setDetectedProject(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] font-semibold text-text-primary focus:outline-none"
              >
                {projectsList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Grouped Tabs Accordion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span>Browser Tabs Grouped by Domain</span>
              <button onClick={handleToggleAll} className="text-[11px] text-pepper-400 hover:underline">
                {selectedIndices.size === tabs.length ? 'Deselect All' : 'Select All (⌘A)'}
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto pr-1">
              <DomainTabAccordion
                tabs={tabs}
                selectedIndices={selectedIndices}
                onToggleIndex={handleToggleIndex}
                onToggleDomain={handleToggleDomain}
              />
            </div>
          </div>

          {/* Progressive Disclosure: Advanced Drawer */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-text-primary"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showAdvanced && (
              <div className="pt-2 space-y-2 text-xs animate-slide-up">
                <div>
                  <label className="block text-[11px] text-text-muted font-medium mb-1">Custom Tags</label>
                  <input
                    type="text"
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                    placeholder="comma separated tags"
                    className="w-full bg-surface-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 1-Click Save CTA & Action Breakdown */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving || selectedIndices.size === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-pepper-500 hover:bg-pepper-600 active:bg-pepper-700 font-bold text-xs text-white rounded-xl transition-all shadow-xl shadow-pepper-500/25 disabled:opacity-50 hover:scale-[1.01]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Workspace…' : `Save Workspace (Enter / ⌘S)`}</span>
            </button>

            <div className="grid grid-cols-2 gap-1 text-[10px] font-medium text-text-muted text-center pt-1">
              <span>✓ Save workspace</span>
              <span>✓ Close {selectedIndices.size} tabs</span>
              <span>✓ Generate AI summary</span>
              <span>✓ Assign project</span>
            </div>
          </div>

          {/* Recent Workspaces Quick Restore */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-muted">Recent Workspaces</span>
              <button onClick={openPalette} className="text-[11px] font-medium text-pepper-400 hover:underline">
                ⌘K
              </button>
            </div>

            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {filteredSessions.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover text-xs transition-colors"
                >
                  <span className="truncate font-medium text-text-primary max-w-[200px]">{s.name}</span>
                  <button
                    onClick={() => restoreSession(s.id)}
                    className="flex items-center gap-1 text-[11px] text-pepper-400 font-semibold hover:text-pepper-500"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings View */}
      {view === 'settings' && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <button onClick={() => setView('save')} className="p-1 text-text-muted hover:text-text-primary rounded">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="font-bold text-sm text-text-primary">SETTINGS & TEMPLATES</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text-muted mb-1">Name Template</label>
                <input
                  type="text"
                  value={settings.nameTemplate}
                  onChange={(e) => updateSettings({ nameTemplate: e.target.value })}
                  placeholder="{{date}} — {{time}}"
                  className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-text-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border/50">
                <div>
                  <div className="font-semibold text-text-primary">Close Tabs After Saving</div>
                  <div className="text-[10px] text-text-muted">Free RAM immediately</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.closeTabsOnSave}
                  onChange={(e) => updateSettings({ closeTabsOnSave: e.target.checked })}
                  className="accent-pepper-500 w-4 h-4"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setView('save')}
            className="w-full py-2 bg-surface-card hover:bg-surface-hover border border-border font-semibold text-xs rounded-lg"
          >
            Back to Save
          </button>
        </div>
      )}

      {/* Success View */}
      {view === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
          <CheckCircle2 className="w-12 h-12 text-pepper-500 animate-bounce" />
          <div>
            <h2 className="text-base font-bold text-text-primary">Workspace Saved!</h2>
            <p className="text-xs text-text-muted mt-1">{lastSaved?.name}</p>
            <p className="text-xs text-pepper-400 font-semibold mt-0.5">{lastSaved?.tabCount} tabs saved & closed</p>
          </div>

          <div className="flex gap-2 w-full pt-4">
            <button
              onClick={async () => {
                if (lastSaved) {
                  await useSessionStore.getState().restoreSession(lastSaved.id);
                  await useSessionStore.getState().deleteSession(lastSaved.id);
                  window.close();
                }
              }}
              className="flex-1 py-2 px-3 bg-surface-card hover:bg-surface-hover border border-border text-xs font-semibold rounded-lg text-text-primary"
            >
              Undo & Restore
            </button>
            <button
              onClick={() => window.close()}
              className="flex-1 py-2 px-3 bg-pepper-500 hover:bg-pepper-600 text-xs font-semibold rounded-lg text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
