import React, { useState } from 'react';
import { PepperSession } from '../core/types/session';
import { useSessionStore } from '../stores/session-store';
import { healthEngine } from '../core/engines/health-engine';
import { sessionEngine } from '../core/engines/session-engine';
import { AutoTitleSkill } from '../core/intelligence/skills/auto-title';
import { WorkspaceSummarySkill } from '../core/intelligence/skills/workspace-summary';
import { aiLogger } from '../core/intelligence/utils/ai-logger';
import { TokenBudgetEstimator } from '../core/intelligence/utils/token-budget';
import { WorkspaceHoverPortal } from './dashboard/WorkspaceHoverPortal';
import { Star, Pin, Trash2, RotateCcw, ChevronDown, ChevronUp, Globe, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Layers, Clock, ArrowUpRight } from 'lucide-react';

interface SessionCardProps {
  session: PepperSession;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const { restoreSession, deleteSession, toggleFavorite, togglePin, fetchSessions } = useSessionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ status: 'loading' | 'success' | 'error'; message: string } | null>(null);

  const health = healthEngine.calculateHealth(session);
  const isGenericName = !session.name || session.name.includes('—') || session.name.toLowerCase().startsWith('saved window');

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRestoring(true);
    try {
      await restoreSession(session.id);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleGenerateTitle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const traceId = `manual_title_${session.id}_${Date.now()}`;
    aiLogger.startTrace(traceId);

    const est = TokenBudgetEstimator.estimateCost('workspaceTitle', 32);

    setIsAiGenerating(true);
    setAiFeedback({
      status: 'loading',
      message: `Generating title (~${est.outputTokens} output tokens, cost: ${est.costStr})...`,
    });

    try {
      const skill = new AutoTitleSkill();
      const res = await skill.execute({
        id: `task_${traceId}`,
        skillId: skill.id,
        priority: 'HIGH',
        requirements: skill.requirements,
        input: session.tabs,
        context: { traceId, createdAt: Date.now() },
      });

      if (res.success && res.data && typeof res.data === 'string') {
        await sessionEngine.updateSession(session.id, { name: res.data });
        await fetchSessions();
        setAiFeedback({ status: 'success', message: 'Workspace renamed successfully!' });
      } else {
        const errorDetail = res.error || 'AI provider request failed';
        const topDomains = Array.from(new Set(session.tabs.map((t) => {
          try { return new URL(t.url).hostname.replace(/^www\./, '').split('.')[0]; } catch { return ''; }
        }).filter(Boolean)));
        const mainDomain = topDomains[0] || 'Web';
        const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
        const firstTabTitle = session.tabs[0]?.title?.split(/[-|–]/)[0].trim() || 'Workspace';
        const heuristicName = `${capitalizedDomain} ${firstTabTitle}`.substring(0, 35);

        await sessionEngine.updateSession(session.id, { name: heuristicName });
        await fetchSessions();
        setAiFeedback({ status: 'error', message: `${errorDetail} (Heuristic: "${heuristicName}")` });
      }
    } catch (err) {
      setAiFeedback({ status: 'error', message: (err as Error).message });
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setAiFeedback(null), 5000);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Group top domains to render previews
  const uniqueDomains = Array.from(
    new Set(
      session.tabs
        .map((t) => {
          try { return new URL(t.url).hostname.replace(/^www\./, ''); } catch { return ''; }
        })
        .filter(Boolean)
    )
  );

  return (
    <div className="relative bg-surface-card border border-border/70 rounded-2xl p-5 hover:border-pepper-500/40 hover:bg-surface-hover/80 shadow-md transition-all duration-300 space-y-4 group">
      
      {/* LEVEL 1: Project Identity & Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Project Embellished Mark */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-border/80 font-bold text-base shadow-inner shrink-0">
            {session.projectName?.toLowerCase().includes('shop') ? '🛍️' : 
             session.projectName?.toLowerCase().includes('code') || session.projectName?.toLowerCase().includes('dev') ? '💻' : 
             session.projectName?.toLowerCase().includes('market') ? '📈' : '📁'}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-pepper-400">
                {session.projectName || 'General'}
              </span>
              {session.isPinned && <Pin className="w-3 h-3 text-pepper-400 fill-pepper-400" />}
              {session.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" title="Active Context" />
            </div>
            
            <h3 className="text-base font-bold text-text-primary tracking-tight truncate leading-tight">
              {session.name}
            </h3>
          </div>
        </div>

        {/* Health status score badge */}
        <span
          className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border"
          style={{ backgroundColor: `${health.color}15`, color: health.color, borderColor: `${health.color}30` }}
        >
          {health.score}% Health
        </span>
      </div>

      {/* LEVEL 2: AI Intent / Context Summary */}
      <div className="bg-surface/40 border border-border/40 rounded-xl p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
          <Sparkles className="w-3.5 h-3.5 text-pepper-400" />
          <span>AI Memory Context</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed font-medium">
          {session.summary || 'Workspace memory context captured. Click summary tool to inspect details.'}
        </p>
      </div>

      {/* LEVEL 3: Workspace Grouped Previews & Hover Trigger */}
      <div 
        className="relative flex items-center gap-2.5 pt-1"
        onMouseEnter={() => setShowPortal(true)}
        onMouseLeave={() => setShowPortal(false)}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Previews:</span>
        <div className="flex items-center -space-x-1.5 overflow-hidden cursor-pointer">
          {session.tabs.slice(0, 5).map((tab, idx) => (
            <img
              key={idx}
              src={tab.favIconUrl || '/icons/icon-16.png'}
              alt=""
              className="w-5.5 h-5.5 rounded-full border border-surface-card bg-surface object-cover shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icons/icon-16.png';
              }}
            />
          ))}
          {session.tabCount > 5 && (
            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-surface border border-border text-[9px] font-bold text-text-secondary">
              +{session.tabCount - 5}
            </span>
          )}
        </div>

        {/* Hover Memory Portal */}
        {showPortal && (
          <WorkspaceHoverPortal session={session} onResume={handleRestore} />
        )}
      </div>

      {/* LEVEL 4: Context Metadata Strip */}
      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-text-muted border-t border-border/40 pt-3">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-pepper-400" />
          <strong className="text-text-secondary">{session.tabCount} Tabs</strong>
        </span>
        <span>&bull;</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>Active {timeAgo(session.createdAt)}</span>
        </span>
        {session.estimatedRamSavedMb && (
          <>
            <span>&bull;</span>
            <span className="text-emerald-400 font-semibold">{session.estimatedRamSavedMb} MB Saved</span>
          </>
        )}
      </div>

      {/* LEVEL 5: Actions Area */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Prominent Resume Work CTA */}
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white font-bold text-xs transition-colors shadow-lg shadow-pepper-500/20 active:scale-[0.98]"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
          <span>Resume Workspace</span>
        </button>

        {/* Secondary options group */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(session.id); }}
            className={`p-2 rounded-xl border border-border/50 hover:bg-surface transition-colors ${
              session.isFavorite ? 'text-amber-400 bg-amber-500/5' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Favorite"
          >
            <Star className={`w-4 h-4 ${session.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); togglePin(session.id); }}
            className={`p-2 rounded-xl border border-border/50 hover:bg-surface transition-colors ${
              session.isPinned ? 'text-pepper-400 bg-pepper-500/5' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Pin Workspace"
          >
            <Pin className={`w-4 h-4 ${session.isPinned ? 'fill-pepper-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl border border-border/50 hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
            title="Toggle tab details list"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
            className="p-2 rounded-xl border border-border/50 hover:border-red-500/30 hover:bg-red-500/5 text-text-muted hover:text-red-400 transition-colors"
            title="Delete Workspace"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Tab List Drawer */}
      {isExpanded && (
        <div className="mt-2 pt-3 border-t border-border/40 space-y-1 animate-slide-up">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            Tabs in this workspace ({session.tabs.length})
          </div>
          {session.tabs.map((tab, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 px-2 py-1 rounded-lg hover:bg-surface text-xs text-text-secondary group/tab"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={tab.favIconUrl || '/icons/icon-16.png'}
                  alt=""
                  className="w-3.5 h-3.5 rounded object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/icons/icon-16.png'; }}
                />
                <span className="truncate text-text-primary font-medium">{tab.title || tab.url}</span>
              </div>
              <a
                href={tab.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-muted hover:text-pepper-400 opacity-0 group-hover/tab:opacity-100 transition-opacity shrink-0"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
