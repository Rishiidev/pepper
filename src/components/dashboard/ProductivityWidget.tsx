import React from 'react';
import { Cpu, Layers, FolderKanban, Clock, Zap, Brain } from 'lucide-react';
import { SessionStats } from '../../core/types/session';

interface Props {
  stats: SessionStats | null;
}

export const ProductivityWidget: React.FC<Props> = ({ stats }) => {
  const ramGb = stats ? (stats.estimatedRamSavedMb / 1024).toFixed(1) : '0.0';
  const totalTabs = stats ? stats.totalTabsSaved : 0;
  const totalSessions = stats ? stats.totalSessions : 0;
  const hoursRecovered = Math.round(totalTabs * 0.15);
  const autoCaptures = stats?.autoCaptures ?? 0;
  const manualCaptures = stats?.manualCaptures ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-border/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Memory Saved</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{ramGb} GB</div>
          <div className="text-[11px] text-text-muted">RAM Memory Recovered</div>
        </div>

        <div className="bg-surface-card border border-border/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tabs Saved</span>
            <Layers className="w-4 h-4 text-pepper-400" />
          </div>
          <div className="text-xl font-bold text-text-primary font-mono">{totalTabs}</div>
          <div className="text-[11px] text-text-muted">Across all browser windows</div>
        </div>

        <div className="bg-surface-card border border-border/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Workspaces</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-text-primary font-mono">{totalSessions}</div>
          <div className="text-[11px] text-text-muted">Active projects &amp; sessions</div>
        </div>

        <div className="bg-surface-card border border-border/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Time Recovered</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">{hoursRecovered} Hours</div>
          <div className="text-[11px] text-text-muted">Context switching avoided</div>
        </div>
      </div>

      {/* Memory Engine Capture Breakdown */}
      {(autoCaptures > 0 || totalSessions > 0) && (
        <div className="flex items-center gap-4 px-4 py-3 bg-surface-card border border-border/60 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            <span className="text-text-muted font-semibold">Memory Engine:</span>
          </div>
          <div className="flex items-center gap-4 text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <strong className="text-text-primary">{autoCaptures}</strong> auto-captured
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-pepper-400" />
              <strong className="text-text-primary">{manualCaptures}</strong> manual saves
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
