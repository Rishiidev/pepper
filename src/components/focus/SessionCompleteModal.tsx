import React, { useState } from 'react';
import { FocusSession, UserReflection } from '../../core/types/focus-session';
import { useFocusStore } from '../../stores/focus-store';
import { restoreEngine } from '../../core/engines/restore-engine';
import { Logo } from '../brand/Logo';
import { Sparkles, CheckCircle2, ArrowRight, Brain, Smile, Meh, Frown, Sparkle } from 'lucide-react';

interface Props {
  session: FocusSession | null;
  onClose: () => void;
}

export const SessionCompleteModal: React.FC<Props> = ({ session, onClose }) => {
  const { clearCompletedModal } = useFocusStore();
  const [reflection, setReflection] = useState<UserReflection>('good');
  const [notes, setNotes] = useState<string>('');

  if (!session) return null;

  const minutes = Math.max(1, Math.round(session.elapsedSeconds / 60));

  const handleSave = () => {
    // Restore session if user wants to keep working
    restoreEngine.restoreSession(session.sessionId);
    clearCompletedModal();
    onClose();
  };

  const reflectionsList: Array<{ id: UserReflection; label: string; icon: React.ReactNode }> = [
    { id: 'great', label: 'Great Flow', icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
    { id: 'good', label: 'Good Focus', icon: <Smile className="w-4 h-4 text-blue-400" /> },
    { id: 'okay', label: 'Okay', icon: <Meh className="w-4 h-4 text-amber-400" /> },
    { id: 'difficult', label: 'Distracted', icon: <Frown className="w-4 h-4 text-pepper-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-surface-card border border-border/80 rounded-3xl p-7 shadow-2xl space-y-6 glass-panel animate-portal-expand">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Logo size={28} state="restoring" />
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Focus Complete &bull; {minutes}m Logged
              </span>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                {session.workspaceName}
              </h2>
            </div>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-surface border border-border text-pepper-400">
            {session.projectName || 'General'}
          </span>
        </div>

        {/* AI Work Summary Block */}
        <div className="bg-surface border border-border/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
            <span className="flex items-center gap-1.5 text-pepper-400">
              <Brain className="w-4 h-4" />
              <span>AI Session Intelligence Summary</span>
            </span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            {session.aiSummary || `You completed ${minutes} minutes of deep focus on ${session.workspaceName}.`}
          </p>

          {session.accomplishments && session.accomplishments.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/40 text-xs">
              <span className="text-[10px] font-bold text-text-muted uppercase">Accomplishments:</span>
              <ul className="space-y-1 text-text-secondary text-[11px]">
                {session.accomplishments.map((acc, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">&bull;</span>
                    <span>{acc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {session.suggestedNextStep && (
            <div className="p-2.5 rounded-xl bg-pepper-500/10 border border-pepper-500/20 text-xs text-pepper-400 flex items-center gap-2">
              <Sparkle className="w-4 h-4 shrink-0" />
              <span><strong>Next Step:</strong> {session.suggestedNextStep}</span>
            </div>
          )}
        </div>

        {/* Reflection Picker */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-secondary block">How did this focus session feel?</label>
          <div className="grid grid-cols-4 gap-2">
            {reflectionsList.map((r) => (
              <button
                key={r.id}
                onClick={() => setReflection(r.id)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  reflection === r.id
                    ? 'bg-pepper-500/10 border-pepper-500 text-text-primary shadow-sm'
                    : 'bg-surface border-border/60 text-text-muted hover:text-text-primary'
                }`}
              >
                {r.icon}
                <span className="text-[11px]">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Session Notes Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary block">Optional Notes &amp; Thoughts</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Generated 42 titles, ready for client review..."
            className="w-full bg-surface border border-border/80 rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pepper-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              clearCompletedModal();
              onClose();
            }}
            className="text-xs text-text-muted hover:text-text-primary font-medium"
          >
            Close &amp; Keep In Background
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white transition-all shadow-lg shadow-pepper-500/20 active:scale-[0.98]"
          >
            <span>Save Reflection &amp; Resume Work</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
