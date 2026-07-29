import React from 'react';
import { PepperSession } from '../../core/types/session';
import { SessionCard } from '../SessionCard';
import { Clock, Activity, Sparkles, CheckCircle2, RotateCcw, Save, Calendar } from 'lucide-react';

interface Props {
  sessions: PepperSession[];
}

export const VisualTimelineView: React.FC<Props> = ({ sessions }) => {
  const now = Date.now();
  const oneDay = 86400000;
  const oneWeek = oneDay * 7;
  const oneMonth = oneDay * 30;

  const todaySessions = sessions.filter((s) => now - s.createdAt < oneDay);
  const yesterdaySessions = sessions.filter((s) => now - s.createdAt >= oneDay && now - s.createdAt < oneDay * 2);
  const lastWeekSessions = sessions.filter((s) => now - s.createdAt >= oneDay * 2 && now - s.createdAt < oneWeek);
  const lastMonthSessions = sessions.filter((s) => now - s.createdAt >= oneWeek && now - s.createdAt < oneMonth);
  const olderSessions = sessions.filter((s) => now - s.createdAt >= oneMonth);

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-slide-up">
      {/* Activity Feed Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary tracking-tight">Memory Timeline</h2>
            <p className="text-xs text-text-muted">A sequential, visual history of your workspace interactions and states</p>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-surface-card/30 text-text-muted text-xs">
          No historical memory points capture-recorded yet.
        </div>
      ) : (
        /* Connected Timeline Node Container */
        <div className="relative pl-6 space-y-10 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-pepper-500 before:via-pepper-500/40 before:to-border">
          
          {/* Group: Today */}
          {todaySessions.length > 0 && (
            <div className="space-y-4 relative">
              {/* Pulsing Dot */}
              <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-pepper-500 ring-4 ring-surface flex items-center justify-center animate-pulse" />
              
              <div className="flex items-center gap-2 text-xs font-bold text-pepper-400 uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                <span>Today ({todaySessions.length})</span>
              </div>

              <div className="space-y-4">
                {todaySessions.map((session) => (
                  <div key={session.id} className="relative space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
                      <Save className="w-3.5 h-3.5 text-pepper-500" />
                      <span>Workspace Memory Saved</span>
                      {session.summary && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-mono">
                            <Sparkles className="w-3 h-3" /> AI Summary Active
                          </span>
                        </>
                      )}
                    </div>
                    <SessionCard session={session} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Yesterday */}
          {yesterdaySessions.length > 0 && (
            <div className="space-y-4 relative">
              <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-border ring-4 ring-surface" />
              
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                <Clock className="w-4 h-4 text-text-muted" />
                <span>Yesterday ({yesterdaySessions.length})</span>
              </div>

              <div className="space-y-4">
                {yesterdaySessions.map((session) => (
                  <div key={session.id} className="relative space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Historical Checkpoint</span>
                    </div>
                    <SessionCard session={session} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Last Week */}
          {lastWeekSessions.length > 0 && (
            <div className="space-y-4 relative">
              <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-border/60 ring-4 ring-surface" />
              
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span>Last Week ({lastWeekSessions.length})</span>
              </div>

              <div className="space-y-4">
                {lastWeekSessions.map((session) => (
                  <div key={session.id} className="relative space-y-2">
                    <SessionCard session={session} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Last Month */}
          {lastMonthSessions.length > 0 && (
            <div className="space-y-4 relative">
              <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-border/40 ring-4 ring-surface" />
              
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span>Last Month ({lastMonthSessions.length})</span>
              </div>

              <div className="space-y-4">
                {lastMonthSessions.map((session) => (
                  <div key={session.id} className="relative space-y-2">
                    <SessionCard session={session} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Older */}
          {olderSessions.length > 0 && (
            <div className="space-y-4 relative">
              <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-border/20 ring-4 ring-surface" />
              
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span>Older ({olderSessions.length})</span>
              </div>

              <div className="space-y-4">
                {olderSessions.map((session) => (
                  <div key={session.id} className="relative space-y-2">
                    <SessionCard session={session} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
