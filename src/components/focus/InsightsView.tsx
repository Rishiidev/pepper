import React, { useEffect, useState } from 'react';
import { focusEngine } from '../../core/engines/focus-engine';
import { journalEngine } from '../../core/engines/journal-engine';
import { DailyJournal, FocusSession, MomentumScore, AIPattern } from '../../core/types/focus-session';
import { Brain, Sparkles, Zap, TrendingUp, Calendar, Clock, Layers, CheckCircle2, ArrowUpRight, Lightbulb } from 'lucide-react';

export const InsightsView: React.FC = () => {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [dailyJournal, setDailyJournal] = useState<DailyJournal | null>(null);
  const [momentum, setMomentum] = useState<MomentumScore | null>(null);
  const [patterns, setPatterns] = useState<AIPattern[]>([]);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  const loadData = async () => {
    const all = await focusEngine.getAllSessions();
    setSessions(all);

    const journal = await journalEngine.getDailyJournal();
    setDailyJournal(journal);

    const mom = journalEngine.calculateMomentumScore(all);
    setMomentum(mom);

    const pat = journalEngine.getAIPatterns(all);
    setPatterns(pat);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSeconds = sessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
  const totalHoursStr = (totalSeconds / 3600).toFixed(1);

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4 animate-slide-up select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary tracking-tight">Focus &amp; Work Memory Insights</h2>
            <p className="text-xs text-text-muted">
              AI-generated work journals, momentum tracking, and actionable productivity patterns
            </p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex bg-surface-card border border-border p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTimeframe('today')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              timeframe === 'today' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              timeframe === 'week' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              timeframe === 'month' ? 'bg-pepper-500 text-white font-bold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Momentum Score Hero Banner */}
      {momentum && (
        <div className="relative overflow-hidden rounded-3xl border border-pepper-500/30 bg-gradient-to-br from-surface-card via-surface to-pepper-500/5 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-3 py-1 rounded-full bg-pepper-500/10 border border-pepper-500/20 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Momentum Score</span>
              </span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-3 pt-2">
                <span>{momentum.score}</span>
                <span className="text-xs font-bold text-pepper-400 font-mono">/ 100 &bull; {momentum.label}</span>
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-xl font-medium pt-1">
                {momentum.explanation}
              </p>
            </div>

            {/* Score Radial Ring */}
            <div className="w-24 h-24 rounded-full border-4 border-pepper-500/30 flex items-center justify-center bg-surface font-mono font-extrabold text-2xl text-pepper-400 shadow-inner">
              {momentum.score}%
            </div>
          </div>

          {/* Factor Breakdown */}
          <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border/60 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Consistency</span>
              <div className="font-mono font-bold text-text-primary">{momentum.factors.focusConsistency}%</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Resumption</span>
              <div className="font-mono font-bold text-text-primary">{momentum.factors.resumptionRate}%</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Uninterrupted</span>
              <div className="font-mono font-bold text-text-primary">{momentum.factors.uninterruptedRatio}%</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Completion</span>
              <div className="font-mono font-bold text-text-primary">{momentum.factors.taskCompletion}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Daily AI Work Journal Section */}
      {dailyJournal && (
        <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Brain className="w-4 h-4 text-pepper-500" />
              <span>Daily AI Work Journal ({dailyJournal.dateStr})</span>
            </h3>
            <span className="text-xs font-mono font-bold text-pepper-400">
              {totalHoursStr}h Focused Total
            </span>
          </div>

          {/* Reflection */}
          <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
            <span className="text-[10px] font-bold text-pepper-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Journal Reflection
            </span>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              {dailyJournal.aiReflection}
            </p>
          </div>

          {/* Accomplishments & In Progress split */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 p-3.5 rounded-2xl bg-surface border border-border/60">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accomplished Work
              </span>
              <ul className="space-y-1.5 text-text-secondary text-[11px]">
                {dailyJournal.completedTasks.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">&bull;</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-surface border border-border/60">
              <span className="text-[10px] font-bold text-pepper-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Next Action Items
              </span>
              <ul className="space-y-1.5 text-text-secondary text-[11px]">
                {dailyJournal.inProgressTasks.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-pepper-400 font-bold">&bull;</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* AI Patterns & Recommendations */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2 px-1">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>AI Productivity Patterns &amp; Recommendations</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {patterns.map((pat) => (
            <div
              key={pat.id}
              className="bg-surface-card border border-border/80 rounded-2xl p-4 space-y-2 hover:border-pepper-500/30 transition-all"
            >
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-surface border border-border text-amber-400">
                {pat.category}
              </span>
              <h4 className="font-bold text-xs text-text-primary tracking-tight pt-1">{pat.title}</h4>
              <p className="text-[11px] text-text-muted leading-relaxed">{pat.description}</p>
              <div className="text-[11px] font-semibold text-pepper-400 pt-1 border-t border-border/40">
                💡 {pat.actionableSuggestion}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
