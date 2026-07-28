import React, { useState } from 'react';
import { Sparkles, ArrowRight, Merge, Tag, CheckCircle2 } from 'lucide-react';
import { PepperSession, PepperTab } from '../../core/types/session';
import { restoreEngine } from '../../core/engines/restore-engine';
import { sessionEngine } from '../../core/engines/session-engine';
import { useSessionStore } from '../../stores/session-store';

interface Props {
  latestSession?: PepperSession;
  onClearSearch: () => void;
  onOpenMergeModal: () => void;
}

export const AISuggestionsWidget: React.FC<Props> = ({ latestSession, onClearSearch, onOpenMergeModal }) => {
  const { sessions, fetchSessions } = useSessionStore();
  const [taggingStatus, setTaggingStatus] = useState<string | null>(null);

  const handleResumeRecent = async () => {
    onClearSearch();
    if (latestSession) {
      await restoreEngine.restoreSession(latestSession.id);
    }
  };

  const handleGenerateTags = async () => {
    onClearSearch();
    const untagged = sessions.filter((s: PepperSession) => !s.tags || s.tags.length === 0);
    if (untagged.length === 0) {
      setTaggingStatus('All workspaces already tagged!');
      setTimeout(() => setTaggingStatus(null), 3000);
      return;
    }

    setTaggingStatus(`Generating tags for ${untagged.length} workspace(s)...`);

    for (const session of untagged) {
      const domains: string[] = Array.from(
        new Set(
          session.tabs
            .map((t: PepperTab) => {
              try {
                return new URL(t.url).hostname.replace(/^www\./, '').split('.')[0];
              } catch {
                return '';
              }
            })
            .filter(Boolean)
        )
      ).slice(0, 4);

      await sessionEngine.updateSession(session.id, {
        tags: domains.length > 0 ? domains : ['general', 'research'],
      });
    }

    await fetchSessions();
    setTaggingStatus('Tags generated successfully!');
    setTimeout(() => setTaggingStatus(null), 3000);
  };

  return (
    <div className="bg-surface-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pepper-500" />
          <span>AI Suggestions</span>
        </h3>
        {taggingStatus ? (
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{taggingStatus}</span>
          </span>
        ) : (
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Smart Context
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Suggestion 1: Resume Recent Session */}
        <div
          onClick={handleResumeRecent}
          className="p-3.5 rounded-xl border border-border/60 bg-surface/40 hover:border-pepper-500/40 hover:bg-surface-hover cursor-pointer transition-colors space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span>Resume Recent Session</span>
            <ArrowRight className="w-3.5 h-3.5 text-pepper-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-text-muted truncate">
            {latestSession ? `"${latestSession.name}"` : 'No recent session available'}
          </p>
        </div>

        {/* Suggestion 2: Merge Duplicate Workspaces */}
        <div
          onClick={onOpenMergeModal}
          className="p-3.5 rounded-xl border border-border/60 bg-surface/40 hover:border-pepper-500/40 hover:bg-surface-hover cursor-pointer transition-colors space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span>Merge Duplicate Workspaces</span>
            <Merge className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-text-muted truncate">Detect &amp; combine overlapping windows</p>
        </div>

        {/* Suggestion 3: Generate Missing Tags */}
        <div
          onClick={handleGenerateTags}
          className="p-3.5 rounded-xl border border-border/60 bg-surface/40 hover:border-pepper-500/40 hover:bg-surface-hover cursor-pointer transition-colors space-y-1 group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span>Generate Missing Tags</span>
            <Tag className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-text-muted truncate">Auto-classify untagged sessions</p>
        </div>
      </div>
    </div>
  );
};
