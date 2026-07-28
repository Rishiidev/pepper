import React from 'react';
import { PepperSession } from '../../core/types/session';
import { SessionCard } from '../SessionCard';
import { Clock, Activity, Sparkles, CheckCircle2, RotateCcw, Save } from 'lucide-react';

interface Props {
  sessions: PepperSession[];
}

export const VisualTimelineView: React.FC<Props> = ({ sessions }) => {
  const now = Date.now();
  const oneDay = 86400000;

  const todaySessions = sessions.filter((s) => now - s.createdAt < oneDay);
  const yesterdaySessions = sessions.filter((s) => now - s.createdAt >= oneDay && now - s.createdAt < oneDay * 2);
  const olderSessions = sessions.filter((s) => now - s.createdAt >= oneDay * 2);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Activity Feed Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pepper-500/10 text-pepper-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-text-primary">Connected Activity Timeline</h2>
            <p className="text-xs text-text-muted">Visual story of saved, restored, and AI-enhanced workspaces</p>
          </div>
        </div>
      </div>

      {/* Connected Timeline Node Container */}
      <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-pepper-500 before:via-pepper-500/40 before:to-border">
        {/* Group: Today */}
        {todaySessions.length > 0 && (
          <div className="space-y-4 relative">
            {/* Timeline Node Dot */}
            <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-pepper-500 ring-4 ring-surface flex items-center justify-center animate-pulse" />

            <div className="flex items-center gap-2 text-xs font-bold text-pepper-400 uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Today ({todaySessions.length})</span>
            </div>

            <div className="space-y-4">
              {todaySessions.map((session) => (
                <div key={session.id} className="relative space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
                    <Save className="w-3.5 h-3.5 text-pepper-500" />
                    <span>Saved Workspace</span>
                    {session.summary && (
                      <>
                        <span>&bull;</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Summary Ready
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
            {/* Timeline Node Dot */}
            <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-border ring-4 ring-surface" />

            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
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

        {/* Group: Older */}
        {olderSessions.length > 0 && (
          <div className="space-y-4 relative">
            {/* Timeline Node Dot */}
            <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-border/40 ring-4 ring-surface" />

            <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
              <Clock className="w-4 h-4 text-text-muted" />
              <span>Older Workspaces ({olderSessions.length})</span>
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
    </div>
  );
};
