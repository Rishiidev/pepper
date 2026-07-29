import React, { useState } from 'react';
import { DailyActivityRecord } from '../../core/types/history-insights';
import { useSessionStore } from '../../stores/session-store';
import { Brain, Clock, Sparkles, CheckCircle2, ArrowUpRight, RotateCcw, X, Edit3, Save, Layers, Timer, Coffee, Zap } from 'lucide-react';

interface Props {
  record: DailyActivityRecord;
  onClose: () => void;
  onSaveNotes?: (dateStr: string, notes: string) => void;
}

export const DailyWorkDetailPanel: React.FC<Props> = ({ record, onClose, onSaveNotes }) => {
  const { restoreSession } = useSessionStore();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(record.manualNotes || '');
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  const formatSecs = (secs: number) => {
    if (secs === 0) return '0m';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m < 60) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    if (onSaveNotes) {
      onSaveNotes(record.dateStr, notesText);
    }
  };

  const formattedDate = new Date(record.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-6 shadow-2xl animate-slide-up select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-2.5 py-0.5 rounded-md bg-pepper-500/10 border border-pepper-500/20">
              Daily Work Detail &bull; {record.activityScore.levelLabel}
            </span>
            <span className="text-xs font-mono font-bold text-pepper-400 bg-surface px-2 py-0.5 rounded border border-border">
              {record.activityScore.score} / 100 Pts
            </span>
          </div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight pt-1">{formattedDate}</h2>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl border border-border hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          title="Close detail panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Daily Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div className="p-3 rounded-2xl bg-surface border border-border/60 space-y-1">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Focused Time</span>
          <span className="font-extrabold font-mono text-sm text-pepper-400">{formatSecs(record.focusedSeconds)}</span>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border/60 space-y-1">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Active Flow</span>
          <span className="font-extrabold font-mono text-sm text-emerald-400">{formatSecs(record.activeWorkSeconds)}</span>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border/60 space-y-1">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Breaks Logged</span>
          <span className="font-extrabold font-mono text-sm text-blue-400">{formatSecs(record.breakSeconds)}</span>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border/60 space-y-1">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Focus Sessions</span>
          <span className="font-extrabold text-sm text-text-primary">{record.sessionsCount}</span>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border/60 space-y-1">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Workspaces</span>
          <span className="font-extrabold text-sm text-text-primary">{record.workspacesCount}</span>
        </div>
      </div>

      {/* Grounded AI Daily Summary */}
      <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            <span>AI Daily Summary</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Grounded in Activity Logs
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed font-medium">
          {record.aiSummary || 'Pepper does not have enough activity data to generate a reliable summary for this day.'}
        </p>
      </div>

      {/* Split: Accomplishments & Next Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Accomplishments */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed Accomplishments</span>
          </span>
          <ul className="space-y-1.5 text-text-secondary text-[11px]">
            {record.accomplishments.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Unfinished / Next Actions */}
        <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-pepper-400 flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Unfinished &amp; Suggested Next Steps</span>
          </span>
          <ul className="space-y-1.5 text-text-secondary text-[11px]">
            {record.inProgressTasks.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-pepper-400 font-bold">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chronological Daily Activity Timeline */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Clock className="w-4 h-4 text-pepper-500" />
          <span>Chronological Activity Timeline</span>
        </h3>

        {record.sessions.length === 0 && record.workspaces.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-surface/30 text-text-muted text-xs">
            No focus sessions or workspace saves recorded on this day.
          </div>
        ) : (
          <div className="space-y-2 pl-3 border-l-2 border-border/60">
            {record.sessions.map((sess) => {
              const timeStr = new Date(sess.startedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-2xl bg-surface border border-border/60 hover:border-pepper-500/30 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-pepper-400">{timeStr}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-pepper-500" />
                      <span className="text-xs font-bold text-text-primary">{sess.workspaceName}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-surface-card border border-border text-text-secondary">
                        {sess.mode}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-text-muted">
                        {formatSecs(sess.elapsedSeconds)}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsRestoringId(sess.sessionId);
                          await restoreSession(sess.sessionId);
                          setIsRestoringId(null);
                        }}
                        disabled={isRestoringId === sess.sessionId}
                        className="flex items-center gap-1 text-[11px] font-bold text-pepper-400 hover:underline px-2.5 py-1 rounded bg-pepper-500/10 border border-pepper-500/20"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRestoringId === sess.sessionId ? 'animate-spin' : ''}`} />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>

                  {sess.aiSummary && (
                    <p className="text-[11px] text-text-muted leading-relaxed font-medium italic pl-1 border-l border-pepper-500/30">
                      "{sess.aiSummary}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Work Notes Section */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Edit3 className="w-3.5 h-3.5 text-pepper-500" />
            <span>Manual Work Notes</span>
          </label>

          {isEditingNotes ? (
            <button
              onClick={handleSaveNotes}
              className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Notes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-xs font-bold text-pepper-400 hover:underline"
            >
              {notesText ? 'Edit Notes' : '+ Add Work Note'}
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Write any personal notes, key decisions, or blocker details for this day..."
            rows={3}
            className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pepper-500 font-sans leading-relaxed"
          />
        ) : notesText ? (
          <div className="p-3.5 rounded-xl bg-surface border border-border/60 text-xs text-text-secondary leading-relaxed font-medium">
            {notesText}
          </div>
        ) : (
          <div className="text-[11px] text-text-muted italic">No manual notes added for this date.</div>
        )}
      </div>
    </div>
  );
};
