import React, { useState } from 'react';
import { PepperSession } from '../core/types/session';
import { useSessionStore } from '../stores/session-store';
import { Star, Pin, Trash2, RotateCcw, ChevronDown, ChevronUp, Globe } from 'lucide-react';

interface SessionCardProps {
  session: PepperSession;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const { restoreSession, deleteSession, toggleFavorite, togglePin } = useSessionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRestoring(true);
    try {
      await restoreSession(session.id);
    } finally {
      setIsRestoring(false);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const visibleFavicons = session.tabs.slice(0, 4);
  const extraCount = session.tabCount - visibleFavicons.length;

  return (
    <div className="bg-surface-card border border-border rounded-xl p-4 transition-all duration-200 hover:border-pepper-500/40 hover:bg-surface-hover shadow-sm group">
      <div className="flex items-start justify-between gap-4">
        {/* Favicon Stack & Session Details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {/* Favicons */}
          <div className="flex -space-x-2 overflow-hidden shrink-0 pt-0.5">
            {visibleFavicons.map((tab, idx) => (
              <img
                key={idx}
                src={tab.favIconUrl || '/icons/icon-16.png'}
                alt=""
                className="inline-block w-6 h-6 rounded-full ring-2 ring-surface-card bg-surface object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                }}
              />
            ))}
            {extraCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface border border-border text-[10px] font-semibold text-text-secondary ring-2 ring-surface-card shrink-0">
                +{extraCount}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {session.name}
              </h3>
              {session.isPinned && <Pin className="w-3.5 h-3.5 text-pepper-400 shrink-0 fill-pepper-400" />}
              {session.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
              <span>{session.tabCount} tabs</span>
              <span>•</span>
              <span>{timeAgo(session.createdAt)}</span>
              {session.projectName && (
                <>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-text-secondary font-medium">
                    {session.projectName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(session.id);
            }}
            className={`p-1.5 rounded-lg border border-transparent hover:border-border transition-colors ${
              session.isFavorite ? 'text-amber-400' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Favorite"
          >
            <Star className={`w-4 h-4 ${session.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePin(session.id);
            }}
            className={`p-1.5 rounded-lg border border-transparent hover:border-border transition-colors ${
              session.isPinned ? 'text-pepper-400' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Pin workspace"
          >
            <Pin className={`w-4 h-4 ${session.isPinned ? 'fill-pepper-400' : ''}`} />
          </button>

          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Restoring…' : 'Restore'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.id);
            }}
            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-surface rounded-lg transition-colors"
            title="Delete workspace"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Tab List Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1 animate-slide-up">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Tabs in this workspace ({session.tabs.length})
          </div>
          {session.tabs.map((tab, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md hover:bg-surface text-xs text-text-secondary group/tab"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={tab.favIconUrl || '/icons/icon-16.png'}
                  alt=""
                  className="w-3.5 h-3.5 rounded object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                  }}
                />
                <span className="truncate text-text-primary font-medium">{tab.title || tab.url}</span>
              </div>
              <a
                href={tab.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-muted hover:text-pepper-400 opacity-0 group-hover/tab:opacity-100 transition-opacity shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
