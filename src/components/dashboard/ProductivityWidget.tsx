import React from 'react';
import { Cpu, Layers, FolderKanban, Clock } from 'lucide-react';
import { SessionStats } from '../../core/types/session';

interface Props {
  stats: SessionStats | null;
}

export const ProductivityWidget: React.FC<Props> = ({ stats }) => {
  const ramGb = stats ? (stats.estimatedRamSavedMb / 1024).toFixed(1) : '0.0';
  const totalTabs = stats ? stats.totalTabsSaved : 0;
  const totalSessions = stats ? stats.totalSessions : 0;
  const hoursRecovered = Math.round(totalTabs * 0.15); // ~10 mins saved per tab group

  return (
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
  );
};
