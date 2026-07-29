import React, { useState } from 'react';
import { PepperSession } from '../core/types/session';
import { useSessionStore } from '../stores/session-store';
import { useSettingsStore } from '../stores/settings-store';
import { healthEngine } from '../core/engines/health-engine';
import { sessionEngine } from '../core/engines/session-engine';
import { AutoTitleSkill } from '../core/intelligence/skills/auto-title';
import { WorkspaceSummarySkill } from '../core/intelligence/skills/workspace-summary';
import { aiLogger } from '../core/intelligence/utils/ai-logger';
import { TokenBudgetEstimator } from '../core/intelligence/utils/token-budget';
import { WorkspaceHoverPortal } from './dashboard/WorkspaceHoverPortal';
import { sanitizeDisplayTitle, sanitizeDisplaySummary } from '../core/utils/text-sanitizer';
import { useFocusStore } from '../stores/focus-store';
import { Star, Pin, Trash2, RotateCcw, ChevronDown, ChevronUp, Globe, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Layers, Clock, ArrowUpRight, Brain, Zap, Eye, Timer } from 'lucide-react';

const CAPTURE_LABELS: Record<string, { label: string; color: string }> = {
  manual: { label: 'Manual Save', color: 'text-pepper-400 bg-pepper-500/10 border-pepper-500/20' },
  auto_window_close: { label: 'Auto-captured', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  auto_idle: { label: 'Idle Capture', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  keyboard_shortcut: { label: 'Shortcut', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

interface SessionCardProps {
  session: PepperSession;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const { restoreSession, deleteSession, toggleFavorite, togglePin, fetchSessions } = useSessionStore();
  const { settings } = useSettingsStore();
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
              {sanitizeDisplayTitle(session.name, session.tabs)}
            </h3>
          </div>
        </div>

        {/* Capture type + Health badges */}
        <div className="flex items-center gap-2 shrink-0">
          {session.captureType && session.captureType !== 'manual' && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${CAPTURE_LABELS[session.captureType]?.color || CAPTURE_LABELS.manual.color}`}>
              <Zap className="w-3 h-3" />
              {CAPTURE_LABELS[session.captureType]?.label || 'Captured'}
            </span>
          )}
          <span
            className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border"
            style={{ backgroundColor: `${health.color}15`, color: health.color, borderColor: `${health.color}30` }}
          >
            {health.score}% Health
          </span>
        </div>
      </div>

      {/* LEVEL 2: AI Intent / Context Summary */}
      <div className="bg-surface/40 border border-border/40 rounded-xl p-3.5 space-y-2">
        {session.sessionIntent && (
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="text-xs text-violet-300 font-semibold">{session.sessionIntent}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
          <Sparkles className="w-3.5 h-3.5 text-pepper-400" />
          <span>AI Memory Context</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed font-medium">
          {sanitizeDisplaySummary(session.summary, session.tabCount, session.projectName)}
        </p>
      </div>

      {/* Domain Clusters Strip */}
      {session.domainClusters && session.domainClusters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
          {session.domainClusters.slice(0, 5).map((domain) => (
            <span key={domain} className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-surface border border-border/60 text-text-secondary">
              {domain}
            </span>
          ))}
        </div>
      )}

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
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white font-bold text-xs transition-colors shadow-lg shadow-pepper-500/20 active:scale-[0.98]"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
          <span>Reconstruct Memory</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            useFocusStore.getState().startFocus(session, 'pomodoro', 25);
          }}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-pepper-500/30 bg-pepper-500/10 hover:bg-pepper-500/20 text-pepper-400 font-bold text-xs transition-colors active:scale-[0.98]"
          title="Start Focus Session on this Memory"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus</span>
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
            onClick={(e) => {
              e.stopPropagation();
              if (settings.confirmDelete !== false) {
                const confirmed = window.confirm(`Are you sure you want to delete "${session.name}"?`);
                if (!confirmed) return;
              }
              deleteSession(session.id);
            }}
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
          {session.tabs.map((tab, idx) => {
            const duration = session.tabDurations?.[idx];
            const isActiveTab = session.activeTabIndex === idx;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-surface text-xs text-text-secondary group/tab ${
                  isActiveTab ? 'bg-pepper-500/5 border border-pepper-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={tab.favIconUrl || '/icons/icon-16.png'}
                    alt=""
                    className="w-3.5 h-3.5 rounded object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/icons/icon-16.png'; }}
                  />
                  <span className={`truncate font-medium ${isActiveTab ? 'text-pepper-400' : 'text-text-primary'}`}>
                    {isActiveTab && <Eye className="w-3 h-3 inline mr-1 text-pepper-400" />}
                    {tab.title || tab.url}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {duration !== undefined && duration > 0 && (
                    <span className="text-[9px] font-mono text-text-muted bg-surface-card border border-border/40 px-1.5 py-0.5 rounded">
                      {formatDuration(duration)}
                    </span>
                  )}
                  <a
                    href={tab.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-text-muted hover:text-pepper-400 opacity-0 group-hover/tab:opacity-100 transition-opacity"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
