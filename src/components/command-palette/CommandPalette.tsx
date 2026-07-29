import React, { useEffect, useRef, useState } from 'react';
import { useCommandStore } from '../../stores/command-store';
import { useSessionStore } from '../../stores/session-store';
import { searchEngine, RankedResult } from '../../core/engines/search-engine';
import { sanitizeDisplayTitle } from '../../core/utils/text-sanitizer';
import {
  Search,
  Save,
  RotateCcw,
  LayoutGrid,
  Star,
  Trash2,
  X,
  Zap,
  Brain,
  Clock,
  Globe,
  Tag,
  FileText,
  Sparkles,
} from 'lucide-react';

const MATCH_ICONS: Record<string, React.ReactNode> = {
  name: <FileText className="w-3 h-3 text-pepper-400" />,
  intent: <Brain className="w-3 h-3 text-violet-400" />,
  summary: <Sparkles className="w-3 h-3 text-emerald-400" />,
  project: <LayoutGrid className="w-3 h-3 text-blue-400" />,
  tag: <Tag className="w-3 h-3 text-amber-400" />,
  domain: <Globe className="w-3 h-3 text-cyan-400" />,
  tab_title: <FileText className="w-3 h-3 text-text-muted" />,
  tab_url: <Globe className="w-3 h-3 text-text-muted" />,
  all: <Clock className="w-3 h-3 text-text-muted" />,
};

const MATCH_LABELS: Record<string, string> = {
  name: 'Name match',
  intent: 'Memory intent',
  summary: 'AI summary',
  project: 'Project',
  tag: 'Tag match',
  domain: 'Domain',
  tab_title: 'Tab title',
  tab_url: 'URL match',
  all: 'Recent',
};

export const CommandPalette: React.FC = () => {
  const { isOpen, searchQuery, closePalette, setSearchQuery } = useCommandStore();
  const { sessions, saveWorkspace, restoreSession, deleteSession, toggleFavorite } = useSessionStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useCommandStore.getState().togglePalette();
      } else if (e.key === 'Escape' && isOpen) {
        closePalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePalette]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Re-rank when query changes
  useEffect(() => {
    if (!isOpen) return;
    const results = searchEngine.rankedSearch(sessions, { query: searchQuery });
    setRankedResults(results.slice(0, 12));
    setSelectedIndex(0);
  }, [searchQuery, sessions, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await saveWorkspace();
    closePalette();
  };

  const handleOpenManager = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
    } else {
      window.open('/manager.html', '_blank');
    }
    closePalette();
  };

  const handleRestore = (sessionId: string) => {
    restoreSession(sessionId);
    closePalette();
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    const totalItems = rankedResults.length + (searchQuery ? 0 : 2); // +2 for quick actions
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!searchQuery) {
        if (selectedIndex === 0) handleSave();
        else if (selectedIndex === 1) handleOpenManager();
        else if (rankedResults[selectedIndex - 2]) {
          handleRestore(rankedResults[selectedIndex - 2].session.id);
        }
      } else {
        if (rankedResults[selectedIndex]) {
          handleRestore(rankedResults[selectedIndex].session.id);
        }
      }
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const captureLabel = (type?: string) => {
    if (!type || type === 'manual') return null;
    if (type === 'auto_window_close') return 'Auto-captured';
    if (type === 'keyboard_shortcut') return 'Shortcut';
    return 'Auto';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div className="w-full max-w-xl bg-surface-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[65vh] animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-surface">
          <Search className="w-5 h-5 text-pepper-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            placeholder="Search your work memory... (e.g. 'that pricing research')"
            className="w-full bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none text-sm font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-text-muted hover:text-text-primary rounded">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[9px] font-extrabold bg-border/40 text-text-secondary rounded font-mono border border-border/20 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-2 space-y-0.5">
          {/* Quick Actions (shown when no query) */}
          {!searchQuery && (
            <div className="pb-2 space-y-0.5">
              <div className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Quick Actions
              </div>
              <button
                onClick={handleSave}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary rounded-xl transition-colors text-left ${
                  selectedIndex === 0 ? 'bg-pepper-500/10 border border-pepper-500/20' : 'hover:bg-surface-hover'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-pepper-500/10 border border-pepper-500/20 flex items-center justify-center shrink-0">
                  <Save className="w-4 h-4 text-pepper-500" />
                </div>
                <span className="flex-1 font-semibold text-xs">Save Current Workspace</span>
                <kbd className="px-1.5 py-0.5 text-[9px] bg-border/40 text-text-secondary rounded font-mono">⌘⇧S</kbd>
              </button>
              <button
                onClick={handleOpenManager}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary rounded-xl transition-colors text-left ${
                  selectedIndex === 1 ? 'bg-pepper-500/10 border border-pepper-500/20' : 'hover:bg-surface-hover'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                </div>
                <span className="flex-1 font-semibold text-xs">Open Memory Dashboard</span>
                <kbd className="px-1.5 py-0.5 text-[9px] bg-border/40 text-text-secondary rounded font-mono">⌘⇧O</kbd>
              </button>
            </div>
          )}

          {/* Workspace Results */}
          <div className="space-y-0.5">
            <div className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center justify-between">
              <span>{searchQuery ? `Memory Results — ${rankedResults.length} found` : 'Recent Memory'}</span>
              {searchQuery && rankedResults.length > 0 && (
                <span className="text-pepper-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Ranked by relevance
                </span>
              )}
            </div>

            {rankedResults.length === 0 ? (
              <div className="px-4 py-10 text-center space-y-2">
                <Brain className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-text-muted text-xs font-medium">
                  {searchQuery ? `No memories matching "${searchQuery}"` : 'No workspaces saved yet'}
                </p>
                {searchQuery && (
                  <p className="text-text-muted text-[11px]">Try different words — Pepper searches names, summaries, domains, and tab titles</p>
                )}
              </div>
            ) : (
              rankedResults.map((result, idx) => {
                const session = result.session;
                const itemIndex = searchQuery ? idx : idx + 2;
                const isSelected = selectedIndex === itemIndex;
                const autoLabel = captureLabel(session.captureType);

                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl group transition-all cursor-pointer ${
                      isSelected ? 'bg-pepper-500/10 border border-pepper-500/20' : 'hover:bg-surface-hover border border-transparent'
                    }`}
                    onClick={() => handleRestore(session.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4 text-pepper-400 group-hover:rotate-45 transition-transform" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {session.isFavorite && <Star className="w-3 h-3 text-amber-400 inline mr-1 fill-amber-400" />}
                            {sanitizeDisplayTitle(session.name, session.tabs)}
                          </span>
                          {autoLabel && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                              {autoLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                          <span>{session.tabCount} tabs</span>
                          <span>·</span>
                          <span>{timeAgo(session.createdAt)}</span>
                          {searchQuery && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-pepper-400">
                                {MATCH_ICONS[result.matchReason] || MATCH_ICONS.all}
                                {MATCH_LABELS[result.matchReason] || 'Match'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(session.id);
                        }}
                        className="p-1 text-text-muted hover:text-amber-400 rounded"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="p-1 text-text-muted hover:text-red-400 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-border bg-surface/60 flex items-center justify-between text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3 text-pepper-400" />
            Work Memory Engine
          </span>
        </div>
      </div>
    </div>
  );
};
