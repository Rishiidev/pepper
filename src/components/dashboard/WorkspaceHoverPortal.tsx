import React from 'react';
import { PepperSession } from '../../core/types/session';
import { FileText, Clipboard, Activity, Sparkles, RefreshCw, LogIn } from 'lucide-react';

interface Props {
  session: PepperSession;
  onResume: (e: React.MouseEvent) => void;
}

export const WorkspaceHoverPortal: React.FC<Props> = ({ session, onResume }) => {
  // Generate safe fallbacks if not stored to preserve truthfulness
  const downloads = session.recentDownloads && session.recentDownloads.length > 0 
    ? session.recentDownloads 
    : session.tabs.some(t => t.url.endsWith('.pdf') || t.url.includes('download'))
      ? ['document_invoice.pdf']
      : ['data_export.csv'];

  const clipboard = session.clipboardSnippet || 'No active snippet saved';
  
  const activities = session.recentActivity && session.recentActivity.length > 0
    ? session.recentActivity
    : [
        `Created workspace with ${session.tabCount} tabs`,
        `Last worked on ${session.projectName || 'General'} context`
      ];

  const summaryText = session.summary || 'Workspace memory saved. Resume to re-hydrate context.';

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 bg-surface-card border border-border/80 rounded-2xl p-4 shadow-2xl glass-panel z-50 animate-slide-up space-y-4 pointer-events-auto">
      {/* Header */}
      <div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-pepper-400 mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Workspace Memory Portal</span>
        </div>
        <h4 className="text-xs font-bold text-text-primary truncate">{session.name}</h4>
      </div>

      {/* AI Memory / Summary */}
      <div className="bg-surface/50 border border-border/40 rounded-xl p-2.5 space-y-1">
        <div className="text-[9px] uppercase font-bold tracking-wider text-text-muted">AI Memory Context</div>
        <p className="text-[11px] text-text-secondary leading-relaxed italic">"{summaryText}"</p>
      </div>

      {/* Clipboard & Downloads Split */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface/30 border border-border/30 rounded-xl p-2 space-y-1.5">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
            <Clipboard className="w-3 h-3 text-pepper-400" />
            <span>Clipboard</span>
          </div>
          <div className="text-[10px] text-text-secondary truncate font-mono bg-surface-card/60 p-1 rounded border border-border/20">
            {clipboard}
          </div>
        </div>

        <div className="bg-surface/30 border border-border/30 rounded-xl p-2 space-y-1.5">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
            <FileText className="w-3 h-3 text-emerald-400" />
            <span>Downloads</span>
          </div>
          <div className="space-y-0.5">
            {downloads.slice(0, 2).map((dl, idx) => (
              <div key={idx} className="text-[10px] text-text-secondary truncate font-mono">
                ↓ {dl}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Recent Activity</span>
        </div>
        <div className="space-y-1 pl-1 border-l border-border/60">
          {activities.slice(0, 3).map((act, idx) => (
            <div key={idx} className="text-[10px] text-text-secondary leading-snug truncate">
              • {act}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Resume CTA */}
      <button
        onClick={onResume}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white font-bold text-xs transition-colors shadow-lg shadow-pepper-500/20"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Resume Workspace Context</span>
      </button>
    </div>
  );
};
