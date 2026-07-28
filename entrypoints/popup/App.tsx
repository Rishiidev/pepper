import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { useCommandStore } from '../../src/stores/command-store';
import { Logo } from '../../src/components/brand/Logo';
import { RamBadge } from '../../src/components/brand/RamBadge';
import { TabChecklist } from '../../src/components/TabChecklist';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { workspaceEngine } from '../../src/core/engines/workspace-engine';
import { PepperTab, PepperSession } from '../../src/core/types/session';
import { Settings, LayoutGrid, Save, RotateCcw, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function App() {
  const { fetchSessions, saveWorkspace, filteredSessions, restoreSession } = useSessionStore();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { openPalette } = useCommandStore();

  const [view, setView] = useState<'save' | 'settings' | 'success'>('save');
  const [tabs, setTabs] = useState<PepperTab[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [customName, setCustomName] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<PepperSession | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchSettings();
    loadCurrentTabs();
  }, []);

  const loadCurrentTabs = async () => {
    const current = await workspaceEngine.getActiveWindowTabs();
    setTabs(current);
    setSelectedIndices(new Set(current.map((_, i) => i)));
  };

  const handleSave = async () => {
    if (selectedIndices.size === 0) return;
    setIsSaving(true);
    try {
      const selectedTabs = tabs.filter((_, idx) => selectedIndices.has(idx));
      const session = await workspaceEngine.saveWorkspace(customName, selectedTabs);
      setLastSaved(session);
      setView('success');
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

  return (
    <div className="w-[380px] bg-surface text-text-primary p-4 min-h-[460px] flex flex-col font-sans select-none relative">
      <CommandPalette />

      {/* Save View */}
      {view === 'save' && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Logo size={22} />
              <span className="font-bold text-base tracking-tight text-text-primary">PEPPER</span>
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

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Workspace Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Shopify Work (or leave blank for auto)"
                className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pepper-500 transition-colors"
              />
            </div>

            {/* Tab Accordion */}
            <div className="border border-border rounded-lg p-2.5 bg-surface-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  {tabs.length} Tabs in Active Window
                </span>
                <button
                  type="button"
                  onClick={() => setShowChecklist(!showChecklist)}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary font-medium"
                >
                  <span>Filter Tabs</span>
                  {showChecklist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showChecklist && (
                <div className="pt-2 border-t border-border/50">
                  <TabChecklist
                    tabs={tabs}
                    selectedIndices={selectedIndices}
                    onToggleIndex={handleToggleIndex}
                    onToggleAll={handleToggleAll}
                  />
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || selectedIndices.size === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-pepper-500 hover:bg-pepper-600 active:bg-pepper-700 font-semibold text-xs text-white rounded-lg transition-colors shadow-lg shadow-pepper-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Workspace…' : `Save & Close (${selectedIndices.size} Tabs)`}</span>
            </button>
          </div>

          {/* Recent Workspaces Quick Restore */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-muted">Recent Workspaces</span>
              <button onClick={openPalette} className="text-[11px] font-medium text-pepper-400 hover:underline">
                Press ⌘K
              </button>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {filteredSessions.slice(0, 3).map((s) => (
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
                    Restore
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
                <p className="text-[10px] text-text-muted mt-1">
                  Variables: <code className="text-pepper-400">{"{{date}}, {{time}}, {{weekday}}, {{tab_count}}, {{project}}"}</code>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-text-muted mb-1">Default Project Name</label>
                <input
                  type="text"
                  value={settings.defaultProjectName}
                  onChange={(e) => updateSettings({ defaultProjectName: e.target.value })}
                  className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-text-primary"
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
