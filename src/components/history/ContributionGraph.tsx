import React, { useState, useMemo } from 'react';
import { ContributionDay, ActivityLevel } from '../../core/types/history-insights';
import { Sparkles, Calendar, Clock, Layers, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface Props {
  days: ContributionDay[];
  selectedDateStr: string | null;
  onSelectDay: (day: ContributionDay) => void;
}

const LEVEL_COLORS: Record<ActivityLevel, { bg: string; border: string; label: string }> = {
  0: { bg: 'bg-surface-card/60', border: 'border-border/40', label: 'No work recorded' },
  1: { bg: 'bg-pepper-500/20', border: 'border-pepper-500/30', label: 'Light activity (1-29 pts)' },
  2: { bg: 'bg-pepper-500/40', border: 'border-pepper-500/50', label: 'Focused activity (30-59 pts)' },
  3: { bg: 'bg-pepper-500/70', border: 'border-pepper-500/80', label: 'Strong progress (60-84 pts)' },
  4: { bg: 'bg-pepper-500', border: 'border-pepper-400', label: 'High-impact work (85-100 pts)' },
};

export const ContributionGraph: React.FC<Props> = ({ days, selectedDateStr, onSelectDay }) => {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showScoringHelp, setShowScoringHelp] = useState(false);

  // Organize 364 days into 52 weeks (7 days per column, Sunday to Saturday)
  const weeks = useMemo(() => {
    const result: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];

    for (let i = 0; i < days.length; i++) {
      currentWeek.push(days[i]);
      if (currentWeek.length === 7 || i === days.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    return result;
  }, [days]);

  // Compute month labels positioning
  const monthLabels = useMemo(() => {
    const labels: Array<{ name: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeks.forEach((week, wIdx) => {
      const firstDayInWeek = week[0];
      if (firstDayInWeek) {
        const m = firstDayInWeek.date.getMonth();
        if (m !== lastMonth) {
          const name = firstDayInWeek.date.toLocaleString('en-US', { month: 'short' });
          labels.push({ name, weekIndex: wIdx });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [weeks]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (days.length === 0) return;
    let nextIdx = focusedIndex >= 0 ? focusedIndex : days.length - 1;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIdx = Math.min(days.length - 1, nextIdx + 7);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIdx = Math.max(0, nextIdx - 7);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = Math.min(days.length - 1, nextIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = Math.max(0, nextIdx - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (days[nextIdx]) {
        onSelectDay(days[nextIdx]);
      }
    }

    setFocusedIndex(nextIdx);
    setHoveredDay(days[nextIdx] || null);
  };

  const formatSecsToMinsHours = (secs: number) => {
    if (secs === 0) return '0m';
    const m = Math.round(secs / 60);
    if (m < 60) return `${m}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  return (
    <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xl select-none relative">
      {/* Graph Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-2.5 py-0.5 rounded-md bg-pepper-500/10 border border-pepper-500/20">
              Work Activity Matrix
            </span>
            <button
              onClick={() => setShowScoringHelp(!showScoringHelp)}
              className="text-text-muted hover:text-pepper-400 transition-colors"
              title="How is activity calculated?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <h3 className="text-base font-bold text-text-primary tracking-tight pt-1">
            52-Week Work Contribution &amp; Progress Graph
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-text-muted text-[11px] font-medium">
            Click any day to view daily timeline &amp; AI journal
          </div>
        </div>
      </div>

      {/* Transparent Activity Score Calculation Explainer Drawer */}
      {showScoringHelp && (
        <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2 text-xs animate-slide-up">
          <div className="font-bold text-pepper-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Work Activity Score Algorithm</span>
          </div>
          <p className="text-text-secondary leading-relaxed text-[11px]">
            Pepper measures <strong>meaningful work momentum</strong> rather than surveillance metrics like mouse movement or raw browser time. Score (0–100) is calculated from 5 transparent factors:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] pt-1">
            <div className="p-2 rounded-xl bg-surface-card border border-border/40 font-mono">
              <span className="text-pepper-400 block font-bold">Focused Time</span>
              Up to 40 pts
            </div>
            <div className="p-2 rounded-xl bg-surface-card border border-border/40 font-mono">
              <span className="text-pepper-400 block font-bold">Focus Sessions</span>
              Up to 25 pts
            </div>
            <div className="p-2 rounded-xl bg-surface-card border border-border/40 font-mono">
              <span className="text-pepper-400 block font-bold">Workspaces Resumed</span>
              Up to 15 pts
            </div>
            <div className="p-2 rounded-xl bg-surface-card border border-border/40 font-mono">
              <span className="text-pepper-400 block font-bold">Deep-Work Blocks</span>
              Up to 10 pts
            </div>
            <div className="p-2 rounded-xl bg-surface-card border border-border/40 font-mono">
              <span className="text-pepper-400 block font-bold">Accomplishments</span>
              Up to 10 pts
            </div>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="overflow-x-auto pb-2 focus:outline-none focus:ring-1 focus:ring-pepper-500/50 rounded-xl"
      >
        <div className="min-w-[720px] space-y-2">
          {/* Month Labels Bar */}
          <div className="flex text-[10px] font-mono text-text-muted pl-8">
            {monthLabels.map((m, idx) => (
              <div
                key={idx}
                style={{ marginLeft: idx === 0 ? `${m.weekIndex * 13}px` : `${(m.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0)) * 13 - 20}px` }}
              >
                {m.name}
              </div>
            ))}
          </div>

          {/* Grid Layout: Days (Rows 0-6) x Weeks (Columns 0-51) */}
          <div className="flex items-start gap-1">
            {/* Day Labels Column */}
            <div className="flex flex-col justify-between h-[98px] text-[9px] font-mono text-text-muted pr-2 shrink-0 py-0.5">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Matrix Columns */}
            <div className="flex items-center gap-[3.5px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3.5px]">
                  {week.map((day, dIdx) => {
                    const globalIdx = wIdx * 7 + dIdx;
                    const isSelected = selectedDateStr === day.dateStr;
                    const isFocused = focusedIndex === globalIdx;
                    const levelStyle = LEVEL_COLORS[day.level];

                    return (
                      <button
                        key={day.dateStr}
                        onClick={() => onSelectDay(day)}
                        onMouseEnter={() => {
                          setHoveredDay(day);
                          setFocusedIndex(globalIdx);
                        }}
                        className={`w-3 h-3 rounded-[3px] border transition-all duration-150 relative cursor-pointer ${levelStyle.bg} ${levelStyle.border} ${
                          isSelected ? 'ring-2 ring-pepper-400 ring-offset-1 ring-offset-surface scale-125 z-20' : ''
                        } ${isFocused ? 'scale-110 z-10' : 'hover:scale-125 hover:z-20'} ${
                          day.isToday ? 'border-pepper-400 shadow-sm shadow-pepper-500/50' : ''
                        }`}
                        title={`${day.dateStr}: ${levelStyle.label}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Active Hover Quick Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs">
        {/* Hover / Focused Quick Card */}
        <div className="min-h-[24px] flex items-center gap-3">
          {hoveredDay ? (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className="font-bold text-text-primary">
                {new Date(hoveredDay.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-pepper-400 font-mono font-bold">
                {formatSecsToMinsHours(hoveredDay.focusedSeconds)} focused
              </span>
              <span className="text-text-muted font-medium">
                &bull; {hoveredDay.workspacesCount} workspaces &bull; {hoveredDay.sessionsCount} sessions
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border/60 text-text-secondary">
                {LEVEL_COLORS[hoveredDay.level].label.split('(')[0].trim()}
              </span>
            </div>
          ) : (
            <span className="text-text-muted text-[11px] font-medium italic">
              Hover or use arrow keys over grid cells to view quick daily summary
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted shrink-0 font-medium">
          <span>No work</span>
          <div className="flex items-center gap-1">
            {([0, 1, 2, 3, 4] as ActivityLevel[]).map((lvl) => (
              <div
                key={lvl}
                className={`w-3 h-3 rounded-[3px] border ${LEVEL_COLORS[lvl].bg} ${LEVEL_COLORS[lvl].border}`}
                title={LEVEL_COLORS[lvl].label}
              />
            ))}
          </div>
          <span>High-impact work</span>
        </div>
      </div>
    </div>
  );
};
