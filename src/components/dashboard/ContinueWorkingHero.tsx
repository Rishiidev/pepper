import React from 'react';
import { PepperSession } from '../../core/types/session';
import { restoreEngine } from '../../core/engines/restore-engine';
import { healthEngine } from '../../core/engines/health-engine';
import { Play, Sparkles, Clock, Layers, Tag, LogIn } from 'lucide-react';

interface Props {
  session?: PepperSession;
}

export const ContinueWorkingHero: React.FC<Props> = ({ session }) => {
  if (!session) return null;

  const health = healthEngine.calculateHealth(session);

  const handleContinue = () => {
    restoreEngine.restoreSession(session.id);
  };

  const timeAgoStr = () => {
    const diff = Date.now() - (session.updatedAt || session.createdAt);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const topDomains = Array.from(
    new Set(
      session.tabs
        .map((t) => {
          try {
            return new URL(t.url).hostname.replace(/^www\./, '');
          } catch {
            return '';
          }
        })
        .filter(Boolean)
    )
  ).slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pepper-500/20 bg-gradient-to-br from-surface-card via-surface to-pepper-500/5 p-6 shadow-xl space-y-5 animate-slide-up">
      {/* Background Glow Effect */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-pepper-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-pepper-500/10 text-pepper-400 border border-pepper-500/25 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pepper-400" />
            <span>Continue Working</span>
          </span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Active {timeAgoStr()}</span>
          </span>
        </div>

        {/* Workspace Health Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted font-semibold">Workspace Health:</span>
          <span
            className="font-bold font-mono px-2 py-0.5 rounded text-[11px] border"
            style={{ backgroundColor: `${health.color}15`, color: health.color, borderColor: `${health.color}30` }}
          >
            {health.score}%
          </span>
        </div>
      </div>

      {/* Hero Workspace Title & Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            {session.name}
          </h2>
          {session.projectName && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface border border-border text-pepper-400">
              {session.projectName}
            </span>
          )}
        </div>

        <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
          {session.summary ||
            `Contains ${session.tabCount} active browser tabs related to ${
              session.projectName || 'general tasks'
            }. Restore instantly to resume your exact workspace flow.`}
        </p>
      </div>

      {/* Topics & Domain Chips */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Layers className="w-4 h-4 text-pepper-500" />
            <span className="font-bold text-text-primary">{session.tabCount} Tabs</span>
          </div>

          {topDomains.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Tag className="w-3.5 h-3.5 text-text-muted" />
              <div className="flex gap-1.5">
                {topDomains.map((domain) => (
                  <span key={domain} className="px-2 py-0.5 rounded bg-surface border border-border/60 font-mono text-[9px] font-bold">
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white transition-all shadow-xl shadow-pepper-500/20 active:scale-[0.98]"
        >
          <LogIn className="w-4 h-4" />
          <span>Resume Workspace</span>
        </button>
      </div>
    </div>
  );
};
