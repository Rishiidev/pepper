import React, { useState } from 'react';
import { PepperSession } from '../core/types/session';
import { useSessionStore } from '../stores/session-store';
import { healthEngine } from '../core/engines/health-engine';
import { sessionEngine } from '../core/engines/session-engine';
import { AutoTitleSkill } from '../core/intelligence/skills/auto-title';
import { WorkspaceSummarySkill } from '../core/intelligence/skills/workspace-summary';
import { aiLogger } from '../core/intelligence/utils/ai-logger';
import { TokenBudgetEstimator } from '../core/intelligence/utils/token-budget';
import { Star, Pin, Trash2, RotateCcw, ChevronDown, ChevronUp, Globe, Sparkles, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SessionCardProps {
  session: PepperSession;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const { restoreSession, deleteSession, toggleFavorite, togglePin, fetchSessions } = useSessionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
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
      aiLogger.log(traceId, 'COLLECT_TABS', 'info', `Collected ${session.tabs.length} tabs for workspace "${session.name}"`);

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
        aiLogger.log(traceId, 'STORAGE_UPDATE', 'success', `Generated title: "${res.data}"`);
        await sessionEngine.updateSession(session.id, { name: res.data });
        await fetchSessions();
        setAiFeedback({ status: 'success', message: 'Workspace renamed successfully!' });
      } else {
        const errorDetail = res.error || 'AI provider request failed';
        aiLogger.log(traceId, 'AI_ERROR', 'error', errorDetail);

        // Fallback: Generate smart heuristic title from top domain & tab title
        const topDomains = Array.from(
          new Set(
            session.tabs
              .map((t) => {
                try {
                  return new URL(t.url).hostname.replace(/^www\./, '').split('.')[0];
                } catch {
                  return '';
                }
              })
              .filter(Boolean)
          )
        );

        const mainDomain = topDomains[0] || 'Web';
        const capitalizedDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
        const firstTabTitle = session.tabs[0]?.title?.split(/[-|–]/)[0].trim() || 'Workspace';
        const heuristicName = `${capitalizedDomain} ${firstTabTitle}`.substring(0, 35);

        await sessionEngine.updateSession(session.id, { name: heuristicName });
        await fetchSessions();

        setAiFeedback({
          status: 'error',
          message: `${errorDetail} (Used smart fallback: "${heuristicName}")`,
        });
      }
    } catch (err) {
      aiLogger.log(traceId, 'PIPELINE_EXCEPTION', 'error', (err as Error).message);
      setAiFeedback({ status: 'error', message: `Pipeline Exception: ${(err as Error).message}` });
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setAiFeedback(null), 5000);
    }
  };

  const handleGenerateSummary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const traceId = `manual_summary_${session.id}_${Date.now()}`;
    aiLogger.startTrace(traceId);

    const est = TokenBudgetEstimator.estimateCost('summary', 180);

    setIsAiGenerating(true);
    setAiFeedback({
      status: 'loading',
      message: `Generating summary (~${est.outputTokens} output tokens, cost: ${est.costStr})...`,
    });

    try {
      const skill = new WorkspaceSummarySkill();
      const res = await skill.execute({
        id: `task_${traceId}`,
        skillId: skill.id,
        priority: 'HIGH',
        requirements: skill.requirements,
        input: session,
        context: { traceId, createdAt: Date.now() },
      });

      if (res.success && res.data && res.data.summary) {
        await sessionEngine.updateSession(session.id, { summary: res.data.summary });
        await fetchSessions();
        setAiFeedback({ status: 'success', message: 'Summary generated & saved!' });
      } else {
        const errorDetail = res.error || 'Failed to generate summary';
        setAiFeedback({ status: 'error', message: errorDetail });
      }
    } catch (err) {
      setAiFeedback({ status: 'error', message: (err as Error).message });
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setAiFeedback(null), 4000);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const visibleFavicons = session.tabs.slice(0, 4);
  const extraCount = session.tabCount - visibleFavicons.length;

  return (
    <div className="bg-surface-card border border-border rounded-2xl p-4.5 transition-all duration-200 hover:border-pepper-500/40 hover:bg-surface-hover shadow-sm group space-y-3">
      <div className="flex items-start justify-between gap-4">
        {/* Favicon Stack & Session Details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {/* Favicons */}
          <div className="flex -space-x-2 overflow-hidden shrink-0 pt-0.5">
            {visibleFavicons.map((tab, idx) => (
              <img
                key={idx}
                src={tab.favIconUrl || '/icons/icon-16.png'}
                alt=""
                className="inline-block w-6 h-6 rounded-full ring-2 ring-surface-card bg-surface object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                }}
              />
            ))}
            {extraCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface border border-border text-[10px] font-semibold text-text-secondary ring-2 ring-surface-card shrink-0">
                +{extraCount}
              </span>
            )}
          </div>

          {/* Info Header */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary truncate hover:text-pepper-400 transition-colors">
                {session.name}
              </h3>
              {session.isPinned && <Pin className="w-3.5 h-3.5 text-pepper-400 shrink-0 fill-pepper-400" />}
              {session.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />}

              {/* Manual "✨ Generate via AI" CTA for date titles */}
              {isGenericName && (
                <button
                  onClick={handleGenerateTitle}
                  disabled={isAiGenerating}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-pepper-500/10 text-pepper-400 border border-pepper-500/20 hover:bg-pepper-500/20 transition-colors shrink-0 ml-1"
                >
                  <Sparkles className="w-3 h-3 text-pepper-400" />
                  <span>Generate via AI</span>
                </button>
              )}

              {/* Health Badge */}
              <span
                className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ml-auto"
                style={{ backgroundColor: `${health.color}15`, color: health.color, borderColor: `${health.color}30` }}
                title={`Workspace Health: ${health.score}%`}
              >
                {health.score}%
              </span>
            </div>

            {/* AI Feedback & Diagnostic Banner */}
            {aiFeedback && (
              <div
                className={`text-[11px] font-medium flex items-center gap-1.5 p-1.5 rounded-lg border ${
                  aiFeedback.status === 'loading'
                    ? 'bg-pepper-500/10 border-pepper-500/20 text-pepper-400'
                    : aiFeedback.status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {aiFeedback.status === 'loading' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : aiFeedback.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{aiFeedback.message}</span>
              </div>
            )}

            {/* AI Summary or Tab Info */}
            <p className="text-xs text-text-muted truncate leading-relaxed">
              {session.summary || `${session.tabCount} open browser tabs &bull; Last active ${timeAgo(session.createdAt)}`}
            </p>

            {/* Tags & Project */}
            <div className="flex items-center gap-2 pt-0.5">
              {session.projectName && (
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border/80 text-[10px] font-semibold text-pepper-400">
                  {session.projectName}
                </span>
              )}

              {session.tags && session.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {session.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.2 rounded bg-surface border border-border/40 text-[10px] text-text-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleGenerateSummary}
                disabled={isAiGenerating}
                className="text-[10px] font-semibold text-pepper-400 hover:underline ml-auto flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(session.id);
            }}
            className={`p-1.5 rounded-lg border border-transparent hover:border-border transition-colors ${
              session.isFavorite ? 'text-amber-400' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Favorite"
          >
            <Star className={`w-4 h-4 ${session.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePin(session.id);
            }}
            className={`p-1.5 rounded-lg border border-transparent hover:border-border transition-colors ${
              session.isPinned ? 'text-pepper-400' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Pin workspace"
          >
            <Pin className={`w-4 h-4 ${session.isPinned ? 'fill-pepper-400' : ''}`} />
          </button>

          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white transition-colors disabled:opacity-50 shadow-md shadow-pepper-500/20"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Restoring…' : 'Resume'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.id);
            }}
            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-surface rounded-lg transition-colors"
            title="Delete workspace"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Tab List Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1 animate-slide-up">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Tabs in this workspace ({session.tabs.length})
          </div>
          {session.tabs.map((tab, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md hover:bg-surface text-xs text-text-secondary group/tab"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={tab.favIconUrl || '/icons/icon-16.png'}
                  alt=""
                  className="w-3.5 h-3.5 rounded object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                  }}
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
                <Globe className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
