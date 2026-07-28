import React, { useEffect, useRef } from 'react';
import { useCommandStore } from '../../stores/command-store';
import { useSessionStore } from '../../stores/session-store';
import { Search, Save, RotateCcw, LayoutGrid, Star, Pin, Trash2, X } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isOpen, searchQuery, closePalette, setSearchQuery } = useCommandStore();
  const { filteredSessions, saveWorkspace, restoreSession, deleteSession, toggleFavorite } = useSessionStore();
  const inputRef = useRef<HTMLInputElement>(null);

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
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-surface-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
          <Search className="w-5 h-5 text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search workspaces… (⌘K)"
            className="w-full bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none text-sm font-medium"
          />
          <button onClick={closePalette} className="p-1 text-text-muted hover:text-text-primary rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Options & Search Results */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-border/30">
          {/* Action Commands */}
          {!searchQuery && (
            <div className="pb-2 space-y-0.5">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Quick Actions
              </div>
              <button
                onClick={handleSave}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded-lg transition-colors text-left"
              >
                <Save className="w-4 h-4 text-pepper-500" />
                <span className="flex-1 font-medium">Save Current Workspace</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-border text-text-secondary rounded">⌘⇧S</kbd>
              </button>
              <button
                onClick={handleOpenManager}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded-lg transition-colors text-left"
              >
                <LayoutGrid className="w-4 h-4 text-blue-400" />
                <span className="flex-1 font-medium">Open Workspace Manager</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-border text-text-secondary rounded">⌘⇧O</kbd>
              </button>
            </div>
          )}

          {/* Workspaces List */}
          <div className="pt-2 space-y-0.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              {searchQuery ? 'Search Results' : 'Recent Workspaces'}
            </div>

            {filteredSessions.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted text-xs">
                No matching workspaces found
              </div>
            ) : (
              filteredSessions.slice(0, 8).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover rounded-lg group transition-colors cursor-pointer"
                  onClick={() => {
                    restoreSession(session.id);
                    closePalette();
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4 text-pepper-400 group-hover:rotate-45 transition-transform" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {session.isFavorite && <Star className="w-3 h-3 text-amber-400 inline mr-1 fill-amber-400" />}
                        {session.name}
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
                        {session.tabCount} tabs • {session.projectName || 'General'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
