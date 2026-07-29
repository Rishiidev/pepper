import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../../src/stores/session-store';
import { useSettingsStore } from '../../src/stores/settings-store';
import { useCommandStore } from '../../src/stores/command-store';
import { useFocusStore } from '../../src/stores/focus-store';
import { Logo } from '../../src/components/brand/Logo';
import { RamBadge } from '../../src/components/brand/RamBadge';
import { SessionCard } from '../../src/components/SessionCard';
import { CommandPalette } from '../../src/components/command-palette/CommandPalette';
import { IntelligenceSettings } from '../../src/components/IntelligenceSettings';
import { ContinueWorkingHero } from '../../src/components/dashboard/ContinueWorkingHero';
import { ProductivityWidget } from '../../src/components/dashboard/ProductivityWidget';
import { ProjectsOverview } from '../../src/components/dashboard/ProjectsOverview';
import { AISuggestionsWidget } from '../../src/components/dashboard/AISuggestionsWidget';
import { DomainFilterStrip } from '../../src/components/dashboard/DomainFilterStrip';
import { VisualTimelineView } from '../../src/components/dashboard/VisualTimelineView';
import { MergeDuplicatesModal } from '../../src/components/modals/MergeDuplicatesModal';
import { CreateProjectModal } from '../../src/components/modals/CreateProjectModal';
import { OnboardingModal } from '../../src/components/modals/OnboardingModal';
import { MemoryReconstructionOverlay } from '../../src/components/MemoryReconstructionOverlay';
import { FocusView } from '../../src/components/focus/FocusView';
import { InsightsView } from '../../src/components/focus/InsightsView';
import { SessionCompleteModal } from '../../src/components/focus/SessionCompleteModal';
import { PepperSession } from '../../src/core/types/session';
import { Search, Home, Layers, Clock, Cpu, X, Plus, Brain, Download, FolderKanban, Sparkles, Timer, TrendingUp, Pause, Play, CheckCircle2 } from 'lucide-react';

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
  const { settings, isHydrated, fetchSettings } = useSettingsStore();
  const { openPalette } = useCommandStore();
  const {
    activeSession,
    activeMemory,
    isRunning,
    isPaused,
    elapsedSeconds,
    completedSessionForModal,
    pauseFocus,
    resumeFocus,
    completeFocus,
    clearCompletedModal,
  } = useFocusStore();

  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'projects' | 'focus' | 'timeline' | 'insights' | 'settings'>('home');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Active Memory Reconstruction Animation Overlay
  const [reconstructingMemory, setReconstructingMemory] = useState<PepperSession | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchSettings();
  }, []);

  // Automatically trigger Onboarding Tour on first launch ONLY AFTER settings are hydrated from IndexedDB
  useEffect(() => {
    if (isHydrated && settings && settings.hasCompletedOnboarding === false) {
      setIsOnboardingOpen(true);
    }
  }, [isHydrated, settings]);

  const handleSaveMemory = async () => {
    const session = await saveWorkspace();
    if (!session) {
      setFeedbackMsg('No active browser tabs found in any window to capture.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg('Memory captured silently.');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleNavClick = (tab: 'home' | 'memories' | 'projects' | 'focus' | 'timeline' | 'insights' | 'settings') => {
    setActiveTab(tab);
    resetFilters();
  };

  const latestMemory = sessions.length > 0 ? sessions[0] : undefined;
  const projects = Array.from(new Set(sessions.map((s) => s.projectName || 'General'))).filter(Boolean);

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pepper_memories_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col font-sans selection:bg-pepper-500 selection:text-white pb-16">
      <CommandPalette />

      {/* Interactive Onboarding Tour Modal */}
      <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />

      {/* AI Session Completion Modal */}
      {completedSessionForModal && (
        <SessionCompleteModal
          session={completedSessionForModal}
          onClose={() => clearCompletedModal()}
        />
      )}

      {/* Memory Reconstruction Overlay */}
      {reconstructingMemory && (
        <MemoryReconstructionOverlay
          memory={reconstructingMemory}
          onComplete={() => {
            setReconstructingMemory(null);
            fetchSessions();
          }}
          onCancel={() => setReconstructingMemory(null)}
        />
      )}

      {/* Interactive Modals */}
      <MergeDuplicatesModal isOpen={isMergeModalOpen} onClose={() => setIsMergeModalOpen(false)} />
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreated={() => fetchSessions()}
      />

      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className="fixed top-6 right-6 z-50 bg-surface-card text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-pepper-500/30 animate-slide-up flex items-center gap-2">
          <Brain className="w-4 h-4 text-pepper-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between">
        <Logo showText size={28} />

        {/* Global Search Focus Input */}
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') clearSearch();
            }}
            placeholder="Search work memory, intent, tabs... (⌘K)"
            className="w-full bg-surface-card border border-border/80 rounded-xl pl-10 pr-16 py-2 text-xs font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pepper-500 transition-colors shadow-inner"
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
            className="absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-extrabold bg-border/40 text-text-secondary rounded cursor-pointer hover:bg-border font-mono border border-border/20"
          >
            ⌘K
          </kbd>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {stats && <RamBadge mbSaved={stats.estimatedRamSavedMb} label="SAVED" className="py-1 px-3 text-xs" />}
          <button
            onClick={handleSaveMemory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white transition-all shadow-lg shadow-pepper-500/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Save Memory</span>
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-6 py-6 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-56 shrink-0 space-y-6">
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
              Memory OS
            </div>

            <button
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'home' && !selectedProject
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleNavClick('memories')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'memories'
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Memories</span>
              <span className="ml-auto text-[10px] font-mono text-text-muted font-bold bg-border/40 px-1.5 py-0.2 rounded-md">
                {sessions.length}
              </span>
            </button>

            <button
              onClick={() => handleNavClick('projects')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'projects'
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => handleNavClick('focus')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'focus'
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Timer className="w-4 h-4 text-pepper-400" />
              <span>Focus System</span>
              {isRunning && <span className="w-2 h-2 rounded-full bg-pepper-500 animate-pulse ml-auto" />}
            </button>

            <button
              onClick={() => handleNavClick('timeline')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'timeline'
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Timeline</span>
            </button>

            <button
              onClick={() => handleNavClick('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'insights'
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Insights &amp; Journal</span>
            </button>

            <button
              onClick={openPalette}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all text-left"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
              <span className="ml-auto text-[9px] font-mono text-text-muted px-1.5 py-0.2 rounded bg-border/40">
                ⌘K
              </span>
            </button>

            <button
              onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === 'settings'
                  ? 'bg-pepper-500/10 text-pepper-400 border border-pepper-500/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Cpu className="w-4 h-4 text-pepper-400" />
              <span>Settings</span>
            </button>
          </div>

          {/* Active Projects Filter */}
          {projects.length > 0 && (
            <div className="space-y-1 pt-4 border-t border-border/80">
              <div className="px-3 text-[10px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
                Active Projects
              </div>
              {projects.map((proj) => (
                <button
                  key={proj}
                  onClick={() => {
                    setActiveTab('memories');
                    clearSearch();
                    setSelectedProject(selectedProject === proj ? null : proj);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                    selectedProject === proj
                      ? 'bg-surface-hover text-text-primary font-bold border-l-2 border-pepper-500 pl-2.5'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-pepper-500/30 border border-pepper-500/60" />
                  <span className="truncate">{proj}</span>
                </button>
              ))}
            </div>
          )}

          {/* Product Tour & Export */}
          <div className="space-y-2 pt-4 border-t border-border/80">
            <div className="px-3 text-[10px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
              Memory Systems
            </div>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-pepper-500/30 bg-pepper-500/5 text-xs font-semibold text-pepper-400 hover:bg-pepper-500/10 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Welcome Product Tour</span>
            </button>
            <button
              onClick={exportJSON}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Memories (JSON)</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* Search Results Filter Banner */}
          {searchQuery && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-pepper-500/10 border border-pepper-500/20 text-xs text-text-primary">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-pepper-400" />
                <span className="font-medium">
                  Memories matching <strong className="text-pepper-400 font-bold">"{searchQuery}"</strong> &bull; {filteredSessions.length} result(s)
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="flex items-center gap-1 text-[11px] font-bold text-pepper-400 hover:underline"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          )}

          {activeTab === 'settings' ? (
            <IntelligenceSettings />
          ) : activeTab === 'focus' ? (
            <FocusView />
          ) : activeTab === 'insights' ? (
            <InsightsView />
          ) : activeTab === 'timeline' ? (
            <VisualTimelineView sessions={sessions} />
          ) : activeTab === 'projects' ? (
            <div className="space-y-6">
              <ProjectsOverview
                sessions={sessions}
                selectedProject={selectedProject}
                onSelectProject={(p) => setSelectedProject(p)}
                onOpenCreateModal={() => setIsCreateProjectModalOpen(true)}
              />

              {filteredSessions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                    {selectedProject ? `Memories in ${selectedProject}` : 'All Project Memories'} ({filteredSessions.length})
                  </div>
                  <div className="grid grid-cols-1 gap-3.5">
                    {filteredSessions.map((s) => (
                      <SessionCard key={s.id} session={s} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : sessions.length === 0 ? (
            /* Zero State Onboarding */
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-surface-card/40 p-8 space-y-4">
              <Logo size={48} state="normal" />
              <div>
                <h3 className="text-base font-bold text-text-primary">No work memories captured yet</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Close any window or click Save Memory to capture your current browser momentum.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsOnboardingOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-surface-hover text-text-primary font-semibold text-xs rounded-xl transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pepper-400" />
                  <span>Launch Product Tour</span>
                </button>
                <button
                  onClick={handleSaveMemory}
                  className="flex items-center gap-2 px-5 py-2.5 bg-pepper-500 hover:bg-pepper-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-pepper-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Memory</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Home View */}
              {activeTab === 'home' && !searchQuery && (
                <div className="space-y-6">
                  {/* Hero Card: Continue Working */}
                  <ContinueWorkingHero session={latestMemory} />

                  {/* Context Suggestions */}
                  <AISuggestionsWidget
                    latestSession={latestMemory}
                    onClearSearch={clearSearch}
                    onOpenMergeModal={() => setIsMergeModalOpen(true)}
                  />

                  {/* Productivity & Memory Saved Widget */}
                  <ProductivityWidget stats={stats} />

                  {/* Projects Overview */}
                  <ProjectsOverview
                    sessions={sessions}
                    selectedProject={selectedProject}
                    onSelectProject={(p) => setSelectedProject(p)}
                    onOpenCreateModal={() => setIsCreateProjectModalOpen(true)}
                  />

                  {/* Domain Filter Strip */}
                  <DomainFilterStrip
                    sessions={sessions}
                    activeSearchQuery={searchQuery}
                    onSelectDomain={(d) => setSearchQuery(d)}
                  />
                </div>
              )}

              {/* Memories List View */}
              {(activeTab === 'memories' || searchQuery) && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-border/60">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-pepper-400" />
                      <span>{selectedProject ? `Memories — ${selectedProject}` : 'All Captured Memories'}</span>
                    </span>
                    <span>{filteredSessions.length} Memory{filteredSessions.length !== 1 ? 'ies' : ''}</span>
                  </div>

                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-surface-card/30 text-text-muted text-xs">
                      No memories match your active filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {filteredSessions.map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Floating Focus Bar (Visible when Focus timer is running across any tab) */}
      {isRunning && activeSession && activeMemory && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-surface-card/95 backdrop-blur-xl border border-pepper-500/40 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-5 text-xs text-text-primary animate-slide-up">
          <div className="flex items-center gap-2.5">
            <Logo size={20} state={isPaused ? 'normal' : 'saving'} />
            <div className="leading-tight">
              <span className="font-bold text-text-primary block truncate max-w-[180px]">
                {activeMemory.name}
              </span>
              <span className="text-[10px] font-mono text-text-muted font-bold uppercase">
                {activeSession.mode} &bull; {isPaused ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
          </div>

          <div className="font-mono font-extrabold text-base text-pepper-400 px-3 py-1 rounded-lg bg-pepper-500/10 border border-pepper-500/20">
            {formatTime(
              activeSession.mode === 'stopwatch'
                ? elapsedSeconds
                : Math.max(0, activeSession.durationSeconds - elapsedSeconds)
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isPaused ? (
              <button
                onClick={resumeFocus}
                className="p-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white font-bold transition-colors"
                title="Resume"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            ) : (
              <button
                onClick={pauseFocus}
                className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-text-primary transition-colors"
                title="Pause"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => completeFocus()}
              className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
              title="Complete Session"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
