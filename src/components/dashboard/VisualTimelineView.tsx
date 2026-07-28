import React from 'react';
import { PepperSession } from '../../core/types/session';
import { SessionCard } from '../SessionCard';
import { Clock, Activity, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Activity Feed Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pepper-500/10 text-pepper-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-text-primary">Workspace Timeline &amp; Activity</h2>
            <p className="text-xs text-text-muted">Visual history of saved, restored, and AI-enhanced workspaces</p>
          </div>
        </div>
      </div>

      {/* Activity Group: Today */}
      {todaySessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-pepper-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Today ({todaySessions.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-3 border-l-2 border-pepper-500/30 pl-4">
            {todaySessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Group: Yesterday */}
      {yesterdaySessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
            <Clock className="w-4 h-4 text-text-muted" />
            <span>Yesterday ({yesterdaySessions.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-3 border-l-2 border-border pl-4">
            {yesterdaySessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Group: Older */}
      {olderSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
            <Clock className="w-4 h-4 text-text-muted" />
            <span>Older Workspaces ({olderSessions.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-3 border-l-2 border-border/40 pl-4">
            {olderSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
