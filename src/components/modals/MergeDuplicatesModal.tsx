import React, { useState } from 'react';
import { DuplicatePair, duplicateEngine } from '../../core/engines/duplicate-engine';
import { useSessionStore } from '../../stores/session-store';
import { X, Merge, Layers, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MergeDuplicatesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { sessions, fetchSessions } = useSessionStore();
  const duplicates = duplicateEngine.findDuplicates(sessions);
  const [mergingIndex, setMergingIndex] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMerge = async (pair: DuplicatePair, idx: number) => {
    setMergingIndex(idx);
    try {
      const merged = await duplicateEngine.mergeWorkspaces(pair.sessionA, pair.sessionB);
      setSuccessMsg(`Merged into "${merged.name}"`);
      await fetchSessions();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Merge failed:', err);
    } finally {
      setMergingIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pepper-500/10 text-pepper-400">
              <Merge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Merge Duplicate Workspaces</h3>
              <p className="text-[11px] text-text-muted">
                {duplicates.length > 0
                  ? `Found ${duplicates.length} overlapping workspace pair(s)`
                  : 'No duplicate workspaces detected'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:bg-surface-hover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Feedback */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Duplicate Pairs List */}
        {duplicates.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border/60 rounded-xl space-y-2">
            <Layers className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-xs font-semibold text-text-primary">All workspaces are unique!</p>
            <p className="text-[11px] text-text-muted">No overlapping browser sessions found.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {duplicates.map((pair, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border bg-surface/40 space-y-3 hover:border-pepper-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pepper-500/10 text-pepper-400">
                    {pair.similarityScore}% Tab Overlap ({pair.overlapCount} shared tabs)
                  </span>
                  <button
                    onClick={() => handleMerge(pair, idx)}
                    disabled={mergingIndex === idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white transition-colors disabled:opacity-50"
                  >
                    <Merge className="w-3.5 h-3.5" />
                    <span>{mergingIndex === idx ? 'Merging...' : 'Merge Pair'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface border border-border/60 space-y-1">
                    <span className="font-semibold text-text-primary block truncate">{pair.sessionA.name}</span>
                    <span className="text-[11px] text-text-muted">{pair.sessionA.tabCount} tabs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface border border-border/60 space-y-1">
                    <span className="font-semibold text-text-primary block truncate">{pair.sessionB.name}</span>
                    <span className="text-[11px] text-text-muted">{pair.sessionB.tabCount} tabs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-hover">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
