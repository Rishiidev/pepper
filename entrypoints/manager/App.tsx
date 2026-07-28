import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../../src/stores/session-store';
import { useCommandStore } from '../../src/stores/command-store';
import { Logo } from '../../src/components/brand/Logo';
import { RamBadge } from '../../src/components/brand/RamBadge';
import { SessionCard } from '../../src/components/SessionCard';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { IntelligenceSettings } from '../../src/components/IntelligenceSettings';
import { Search, Pin, Star, LayoutGrid, Download, Plus, HardDrive, Layers, Cpu, X, RefreshCw } from 'lucide-react';

export default function App() {
  const {
    sessions,
    filteredSessions,
    timeline,
    stats,
    searchQuery,
    selectedProject,
    fetchSessions,
    setSearchQuery,
    clearSearch,
    setSelectedProject,
    resetFilters,
    saveWorkspace,
  } = useSessionStore();
  const { openPalette } = useCommandStore();

  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'favorites' | 'intelligence'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSave = async () => {
    const session = await saveWorkspace();
    if (!session) {
      setFeedbackMsg('No open web tabs found in any browser window to save.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleNavClick = (tab: 'all' | 'pinned' | 'favorites' | 'intelligence') => {
    setActiveTab(tab);
    resetFilters();
  };

  const projects = Array.from(new Set(sessions.map((s) => s.projectName || 'General'))).filter(Boolean);

  // Compute view-specific filtered sessions
  let displayedSessions = filteredSessions;
  if (activeTab === 'pinned') {
    displayedSessions = filteredSessions.filter((s) => s.isPinned);
  } else if (activeTab === 'favorites') {
    displayedSessions = filteredSessions.filter((s) => s.isFavorite);
  }

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pepper_workspaces_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col font-sans selection:bg-pepper-500 selection:text-white">
      <CommandPalette />

      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className="fixed top-4 right-4 z-50 bg-pepper-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl animate-bounce">
          {feedbackMsg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-text-primary">PEPPER</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
                v2.0
              </span>
            </div>
            <p className="text-xs text-text-muted">The Linear of Browser Workspaces</p>
          </div>
        </div>

        {/* Global Search Focus Input */}
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') clearSearch();
            }}
            placeholder="Search workspaces, tab titles, or URLs… (ESC to clear, ⌘K)"
            className="w-full bg-surface-card border border-border rounded-xl pl-9 pr-16 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pepper-500 transition-colors shadow-inner"
          />
          {searchQuery ? (
            <button
              onClick={clearSearch}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-surface-hover text-text-muted hover:text-text-primary"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <kbd
            onClick={openPalette}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] bg-border/60 text-text-secondary rounded cursor-pointer hover:bg-border"
          >
            ⌘K
          </kbd>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {stats && <RamBadge mbSaved={stats.estimatedRamSavedMb} label="SAVED" className="py-1 px-3 text-xs" />}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pepper-500 hover:bg-pepper-600 font-semibold text-xs text-white transition-colors shadow-lg shadow-pepper-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Save Workspace</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-6 py-6 gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-60 shrink-0 space-y-6">
          {/* Views */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              Navigation
            </div>
            <button
              onClick={() => handleNavClick('all')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                activeTab === 'all' && !selectedProject
                  ? 'bg-pepper-500/10 text-pepper-400 font-semibold border border-pepper-500/20'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>All Workspaces</span>
              <span className="ml-auto text-[10px] opacity-70 font-mono">{sessions.length}</span>
            </button>

            <button
              onClick={() => handleNavClick('pinned')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                activeTab === 'pinned'
                  ? 'bg-pepper-500/10 text-pepper-400 font-semibold border border-pepper-500/20'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Pin className="w-4 h-4" />
              <span>Pinned</span>
              <span className="ml-auto text-[10px] opacity-70 font-mono">{timeline.pinned.length}</span>
            </button>

            <button
              onClick={() => handleNavClick('favorites')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                activeTab === 'favorites'
                  ? 'bg-pepper-500/10 text-pepper-400 font-semibold border border-pepper-500/20'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Favorites</span>
              <span className="ml-auto text-[10px] opacity-70 font-mono">
                {sessions.filter((s) => s.isFavorite).length}
              </span>
            </button>

            <button
              onClick={() => handleNavClick('intelligence')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                activeTab === 'intelligence'
                  ? 'bg-pepper-500/10 text-pepper-400 font-semibold border border-pepper-500/20'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Cpu className="w-4 h-4 text-pepper-400" />
              <span>Intelligence Platform</span>
              <span className="ml-auto text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.5
              </span>
            </button>
          </div>

          {/* Projects */}
          {projects.length > 0 && (
            <div className="space-y-1 pt-4 border-t border-border">
              <div className="px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Projects
              </div>
              {projects.map((proj) => (
                <button
                  key={proj}
                  onClick={() => {
                    setActiveTab('all');
                    clearSearch();
                    setSelectedProject(selectedProject === proj ? null : proj);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    selectedProject === proj
                      ? 'bg-surface-hover text-text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-pepper-500" />
                  <span className="truncate">{proj}</span>
                </button>
              ))}
            </div>
          )}

          {/* Data Tools */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="px-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              Storage &amp; Backup
            </div>
            <button
              onClick={exportJSON}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* Active Filter / Search Indicator Bar */}
          {searchQuery && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-pepper-500/10 border border-pepper-500/20 text-xs text-text-primary">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-pepper-400" />
                <span>
                  Filtering for <strong className="text-pepper-400">"{searchQuery}"</strong> ({displayedSessions.length} match{displayedSessions.length !== 1 ? 'es' : ''})
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="flex items-center gap-1 text-[11px] font-semibold text-pepper-400 hover:underline"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Filter</span>
              </button>
            </div>
          )}

          {activeTab === 'intelligence' ? (
            <IntelligenceSettings />
          ) : sessions.length === 0 ? (
            /* Empty State 1: Zero Workspaces Saved Total */
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-surface-card/40 p-8 space-y-4">
              <div className="p-4 rounded-2xl bg-pepper-500/10 border border-pepper-500/20 text-pepper-400">
                <HardDrive className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">No workspaces yet</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Save your current browser session to create your first workspace.
                </p>
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-pepper-500 hover:bg-pepper-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-pepper-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Save Workspace</span>
              </button>
            </div>
          ) : displayedSessions.length === 0 ? (
            /* Empty State 2: Zero Matching Results for Search Query */
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-surface-card/40 p-8 space-y-4">
              <div className="p-4 rounded-2xl bg-border/40 text-text-muted">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">No matching workspaces</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  No results match "{searchQuery}". Try another keyword or clear the search filter.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-surface-hover font-semibold text-xs rounded-xl text-text-primary transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-pepper-500 hover:bg-pepper-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-pepper-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Workspace</span>
                </button>
              </div>
            </div>
          ) : (
            /* Workspace Grid List */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-border/60">
                <span className="font-semibold uppercase tracking-wider">
                  {activeTab === 'pinned'
                    ? 'Pinned Workspaces'
                    : activeTab === 'favorites'
                    ? 'Favorite Workspaces'
                    : 'All Workspaces'}
                </span>
                <span>{displayedSessions.length} workspace{displayedSessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {displayedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
