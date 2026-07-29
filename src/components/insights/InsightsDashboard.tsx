import React, { useEffect, useState, useMemo } from 'react';
import { useSessionStore } from '../../stores/session-store';
import { focusEngine } from '../../core/engines/focus-engine';
import { activityEngine } from '../../core/engines/activity-engine';
import { projectRepo } from '../../storage/repositories/project-repo';
import { FocusSession } from '../../core/types/focus-session';
import { PepperSession } from '../../core/types/session';
import { PepperProjectEntity } from '../../storage/db';
import {
  FocusOverviewMetrics,
  WorkDistributionItem,
  FocusPatternInsight,
  ProjectMomentumItem,
  StructuredAIInsight,
  WeeklyReviewData,
  MonthlyReviewData,
} from '../../core/types/history-insights';
import {
  TrendingUp,
  Brain,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  PieChart,
  Target,
  Zap,
  RotateCcw,
  Calendar,
  Award,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const InsightsDashboard: React.FC = () => {
  const { sessions, fetchSessions, restoreSession } = useSessionStore();
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [projectsList, setProjectsList] = useState<PepperProjectEntity[]>([]);

  // Timeframe selector
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'year' | 'all'>('30d');
  const [distType, setDistType] = useState<'project' | 'workspace'>('project');
  const [subTab, setSubTab] = useState<'overview' | 'weekly' | 'monthly'>('overview');
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  const loadData = async () => {
    await fetchSessions();
    const allFocus = await focusEngine.getAllSessions();
    setFocusSessions(allFocus);
    const projs = await projectRepo.getAll();
    setProjectsList(projs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const timeframeDays = useMemo(() => {
    switch (timeframe) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case 'year': return 365;
      case 'all': return 9999;
    }
  }, [timeframe]);

  // Section 1: Focus Overview
  const overview = useMemo(() => {
    return activityEngine.getFocusOverview(focusSessions, timeframeDays);
  }, [focusSessions, timeframeDays]);

  // Section 2: Work Distribution
  const distribution = useMemo(() => {
    const cutoff = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
    const filteredSessions = focusSessions.filter((s) => s.startedAt >= cutoff);
    return activityEngine.getWorkDistribution(filteredSessions, sessions, distType);
  }, [focusSessions, sessions, timeframeDays, distType]);

  // Section 3: Focus Patterns
  const patterns = useMemo(() => {
    return activityEngine.getFocusPatterns(focusSessions);
  }, [focusSessions]);

  // Section 4: Project Momentum
  const momentumItems = useMemo(() => {
    return activityEngine.getProjectMomentum(focusSessions, sessions, projectsList);
  }, [focusSessions, sessions, projectsList]);

  // Structured AI Insights Engine
  const aiInsights = useMemo(() => {
    return activityEngine.getStructuredAIInsights(focusSessions, sessions);
  }, [focusSessions, sessions]);

  // Reviews
  const weeklyReview = useMemo(() => {
    return activityEngine.generateWeeklyReview(focusSessions, sessions);
  }, [focusSessions, sessions]);

  const monthlyReview = useMemo(() => {
    return activityEngine.generateMonthlyReview(focusSessions, sessions);
  }, [focusSessions, sessions]);

  const formatSecs = (secs: number) => {
    if (secs === 0) return '0m';
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  const getConfidenceBadgeColor = (conf: 'High' | 'Moderate' | 'Insufficient data') => {
    if (conf === 'High') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (conf === 'Moderate') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-surface text-text-muted border-border';
  };

  const getMomentumColor = (mom: ProjectMomentumItem['momentum']) => {
    if (mom === 'Strong') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (mom === 'Growing') return 'bg-pepper-500/10 text-pepper-400 border-pepper-500/20';
    if (mom === 'Steady') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-surface border-border text-text-muted';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4 animate-slide-up select-none">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary tracking-tight">Executive Work Insights &amp; AI Intelligence</h2>
            <p className="text-xs text-text-muted">
              What does it mean? Grounded analytics, focus overview, project momentum, and AI reviews
            </p>
          </div>
        </div>

        {/* Controls: Range & View Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-tab navigation */}
          <div className="flex bg-surface-card border border-border p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'overview' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Overview &amp; Momentum
            </button>
            <button
              onClick={() => setSubTab('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'weekly' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Weekly Review
            </button>
            <button
              onClick={() => setSubTab('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                subTab === 'monthly' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Monthly Review
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex bg-surface-card border border-border p-1 rounded-xl text-xs font-semibold">
            {(['7d', '30d', '90d', 'year', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg transition-colors uppercase ${
                  timeframe === tf ? 'bg-surface text-pepper-400 font-bold border border-pepper-500/30' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subTab === 'overview' ? (
        <>
          {/* Section 1: Focus Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-3xl bg-surface-card border border-border/80 space-y-1 shadow-md">
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest block">Total Focused Time</span>
              <span className="font-extrabold font-mono text-xl text-pepper-400">{formatSecs(overview.totalFocusedSeconds)}</span>
              {overview.trendPercentage !== undefined && (
                <span className={`text-[10px] font-bold block ${overview.trendPercentage >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {overview.trendPercentage >= 0 ? `+${overview.trendPercentage}%` : `${overview.trendPercentage}%`} vs prior
                </span>
              )}
            </div>

            <div className="p-4 rounded-3xl bg-surface-card border border-border/80 space-y-1 shadow-md">
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest block">Avg Session Length</span>
              <span className="font-extrabold font-mono text-xl text-emerald-400">{formatSecs(overview.avgSessionSeconds)}</span>
              <span className="text-[10px] text-text-muted font-medium block">Target: 25–45m</span>
            </div>

            <div className="p-4 rounded-3xl bg-surface-card border border-border/80 space-y-1 shadow-md">
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest block">Longest Session</span>
              <span className="font-extrabold font-mono text-xl text-blue-400">{formatSecs(overview.longestSessionSeconds)}</span>
              <span className="text-[10px] text-text-muted font-medium block">Uninterrupted work</span>
            </div>

            <div className="p-4 rounded-3xl bg-surface-card border border-border/80 space-y-1 shadow-md">
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest block">Deep-Work Ratio</span>
              <span className="font-extrabold font-mono text-xl text-violet-400">
                {overview.totalFocusedSeconds > 0 ? `${Math.round((overview.deepWorkSeconds / overview.totalFocusedSeconds) * 100)}%` : '0%'}
              </span>
              <span className="text-[10px] text-text-muted font-medium block">{formatSecs(overview.deepWorkSeconds)} in blocks &ge; 30m</span>
            </div>
          </div>

          {/* Section 2: Work Distribution */}
          <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-pepper-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Work Allocation Distribution</h3>
              </div>

              <div className="flex bg-surface border border-border p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setDistType('project')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    distType === 'project' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  By Project
                </button>
                <button
                  onClick={() => setDistType('workspace')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    distType === 'workspace' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  By Workspace
                </button>
              </div>
            </div>

            {distribution.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-xs border border-dashed border-border rounded-2xl">
                No focus activity logged for the selected timeframe.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Horizontal Percentage Bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-surface border border-border/40">
                  {distribution.map((item, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      className="h-full transition-all duration-500"
                      title={`${item.name}: ${item.percentage}% (${formatSecs(item.seconds)})`}
                    />
                  ))}
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs pt-1">
                  {distribution.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-text-primary truncate">{item.name}</span>
                      </div>
                      <span className="font-mono text-pepper-400 font-bold ml-2">
                        {item.percentage}% ({formatSecs(item.seconds)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Project Momentum */}
          <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-pepper-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Project Momentum &amp; Status</h3>
              </div>
              <span className="text-xs text-text-muted font-medium">Tracks active velocity per project</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {momentumItems.map((p) => (
                <div
                  key={p.projectId}
                  className="p-4 rounded-2xl bg-surface border border-border/60 hover:border-pepper-500/30 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <h4 className="font-bold text-xs text-text-primary tracking-tight">{p.projectName}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${getMomentumColor(p.momentum)}`}>
                        {p.momentum} Momentum
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">{p.recentActivityLabel}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-text-secondary leading-relaxed font-medium bg-surface-card/60 p-2.5 rounded-xl border border-border/30">
                    <strong className="text-pepper-400">Suggested Next Step:</strong> {p.suggestedNextStep}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                    <span>Time Invested: <strong className="text-text-primary font-mono">{formatSecs(p.timeInvestedSeconds)}</strong></span>
                    {p.targetWorkspaceId && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsRestoringId(p.targetWorkspaceId!);
                          await restoreSession(p.targetWorkspaceId!);
                          setIsRestoringId(null);
                        }}
                        disabled={isRestoringId === p.targetWorkspaceId}
                        className="flex items-center gap-1 font-bold text-pepper-400 hover:underline"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRestoringId === p.targetWorkspaceId ? 'animate-spin' : ''}`} />
                        <span>Resume Context</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Focus Patterns with Confidence Levels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Focus Patterns &amp; Habits</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {patterns.map((pat) => (
                <div
                  key={pat.id}
                  className="bg-surface-card border border-border/80 rounded-2xl p-4 space-y-2.5 hover:border-pepper-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                      {pat.category.replace('_', ' ')}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${getConfidenceBadgeColor(pat.confidence)}`}>
                      {pat.confidence} Confidence
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-text-primary tracking-tight">{pat.title}</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed font-medium">{pat.description}</p>
                  <div className="text-[10px] text-text-muted italic bg-surface/50 p-2 rounded-lg border border-border/30">
                    Evidence: {pat.evidence}
                  </div>
                  <div className="text-[11px] font-semibold text-pepper-400 pt-1">
                    💡 {pat.actionableSuggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Structured AI Insights Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-pepper-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Grounded AI Insights Engine</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-surface-card border border-pepper-500/30 rounded-3xl p-5 space-y-3 shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-2.5 py-0.5 rounded-full bg-pepper-500/10 border border-pepper-500/20">
                      {insight.type}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${getConfidenceBadgeColor(insight.confidence)}`}>
                      {insight.confidence} Confidence
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-text-primary tracking-tight">{insight.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium">"{insight.insight}"</p>

                  <div className="p-2.5 rounded-xl bg-surface border border-border/60 text-[11px] text-text-muted italic">
                    <strong>Evidence:</strong> {insight.evidence}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-pepper-400 flex items-center gap-1">
                      💡 {insight.suggestedAction}
                    </span>

                    {insight.targetWorkspaceId && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsRestoringId(insight.targetWorkspaceId!);
                          await restoreSession(insight.targetWorkspaceId!);
                          setIsRestoringId(null);
                        }}
                        disabled={isRestoringId === insight.targetWorkspaceId}
                        className="flex items-center gap-1 text-[11px] font-bold text-white bg-pepper-500 hover:bg-pepper-600 px-3 py-1.5 rounded-xl transition-colors shadow-md shrink-0"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRestoringId === insight.targetWorkspaceId ? 'animate-spin' : ''}`} />
                        <span>Resume</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : subTab === 'weekly' ? (
        /* Executive Weekly Review */
        <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-2.5 py-0.5 rounded-md bg-pepper-500/10 border border-pepper-500/20">
                Executive Weekly Review &bull; {weeklyReview.weekLabel}
              </span>
              <h3 className="text-lg font-bold text-text-primary tracking-tight pt-1">Weekly Productivity &amp; Accomplishment Audit</h3>
            </div>
            <div className="text-sm font-mono font-bold text-pepper-400 bg-surface px-3 py-1.5 rounded-xl border border-border">
              {formatSecs(weeklyReview.totalFocusedSeconds)} Focused Total
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Reflection
            </span>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">{weeklyReview.aiReflection}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Main Accomplishment
              </span>
              <p className="text-xs text-text-primary font-bold">{weeklyReview.mainAccomplishment}</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pepper-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Recommendation
              </span>
              <p className="text-xs text-text-primary font-bold">{weeklyReview.recommendation}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Executive Monthly Review */
        <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-2.5 py-0.5 rounded-md bg-pepper-500/10 border border-pepper-500/20">
                Executive Monthly Review &bull; {monthlyReview.monthLabel}
              </span>
              <h3 className="text-lg font-bold text-text-primary tracking-tight pt-1">Monthly Milestones &amp; Work Patterns</h3>
            </div>
            <div className="text-sm font-mono font-bold text-pepper-400 bg-surface px-3 py-1.5 rounded-xl border border-border">
              {formatSecs(monthlyReview.totalFocusedSeconds)} Focused Total
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> AI Executive Summary
            </span>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">{monthlyReview.aiSummary}</p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-surface border border-border/60 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Major Completed Milestones
            </span>
            <ul className="space-y-1.5 text-text-secondary">
              {monthlyReview.completedMilestones.map((m, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">&bull;</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
