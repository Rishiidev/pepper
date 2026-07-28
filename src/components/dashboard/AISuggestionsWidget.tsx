import React from 'react';
import { Sparkles, ArrowRight, Merge, Tag, RefreshCw } from 'lucide-react';
import { PepperSession } from '../../core/types/session';

interface Props {
  latestSession?: PepperSession;
  onClearSearch: () => void;
}

export const AISuggestionsWidget: React.FC<Props> = ({ latestSession, onClearSearch }) => {
  return (
    <div className="bg-surface-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pepper-500" />
          <span>AI Suggestions</span>
        </h3>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Smart Context
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {latestSession && (
          <div
            onClick={onClearSearch}
            className="p-3 rounded-xl border border-border/60 bg-surface/40 hover:border-pepper-500/40 hover:bg-surface-hover cursor-pointer transition-colors space-y-1 group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
              <span>Resume Recent Session</span>
              <ArrowRight className="w-3.5 h-3.5 text-pepper-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-text-muted truncate">"{latestSession.name}"</p>
          </div>
        )}

        <div
          onClick={onClearSearch}
          className="p-3 rounded-xl border border-border/60 bg-surface/40 hover:border-pepper-500/40 hover:bg-surface-hover cursor-pointer transition-colors space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span>Merge Duplicate Workspaces</span>
            <Merge className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-text-muted truncate">Combine overlapping browser windows</p>
        </div>

        <div
          onClick={onClearSearch}
          className="p-3 rounded-xl border border-border/60 bg-surface/40 hover:border-pepper-500/40 hover:bg-surface-hover cursor-pointer transition-colors space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span>Generate Missing Tags</span>
            <Tag className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-text-muted truncate">Auto-classify untagged workspaces</p>
        </div>
      </div>
    </div>
  );
};
