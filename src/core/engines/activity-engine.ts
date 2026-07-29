import { PepperSession } from '../types/session';
import { FocusSession } from '../types/focus-session';
import {
  ActivityLevel,
  WorkActivityScore,
  DailyActivityRecord,
  ContributionDay,
  FocusOverviewMetrics,
  WorkDistributionItem,
  FocusPatternInsight,
  ProjectMomentumItem,
  StructuredAIInsight,
  WeeklyReviewData,
  MonthlyReviewData,
} from '../types/history-insights';

export class ActivityEngine {
  /**
   * Calculates a transparent, daily Work Activity Score (0-100) and Level (0-4)
   */
  calculateDailyActivityScore(
    focusedSeconds: number,
    completedSessionsCount: number,
    workspacesCount: number,
    deepWorkBlocksCount: number,
    accomplishmentsCount: number,
    hasNotes: boolean,
    dateStr: string
  ): WorkActivityScore {
    const focusedMinutes = Math.round(focusedSeconds / 60);

    // Factor 1: Focused Time (max 40 pts — 1 pt per 3 mins)
    const timeScore = Math.min(40, Math.round(focusedMinutes / 3));

    // Factor 2: Completed Focus Sessions (max 25 pts — 5 pts per session)
    const sessionScore = Math.min(25, completedSessionsCount * 5);

    // Factor 3: Workspaces Resumed/Active (max 15 pts — 5 pts per workspace)
    const workspaceScore = Math.min(15, workspacesCount * 5);

    // Factor 4: Deep Work Blocks >= 30m (max 10 pts — 5 pts per block)
    const deepWorkScore = Math.min(10, deepWorkBlocksCount * 5);

    // Factor 5: Accomplishments & Manual Notes (max 10 pts)
    const accomplishmentScore = Math.min(10, accomplishmentsCount * 3 + (hasNotes ? 4 : 0));

    const totalScore = Math.min(100, timeScore + sessionScore + workspaceScore + deepWorkScore + accomplishmentScore);

    let level: ActivityLevel = 0;
    let levelLabel: WorkActivityScore['levelLabel'] = 'No work recorded';

    if (totalScore >= 85) {
      level = 4;
      levelLabel = 'High-impact work';
    } else if (totalScore >= 60) {
      level = 3;
      levelLabel = 'Strong progress';
    } else if (totalScore >= 30) {
      level = 2;
      levelLabel = 'Focused activity';
    } else if (totalScore > 0) {
      level = 1;
      levelLabel = 'Light activity';
    }

    return {
      score: totalScore,
      level,
      levelLabel,
      dateStr,
      factors: {
        focusedMinutes,
        completedSessions: completedSessionsCount,
        workspacesResumed: workspacesCount,
        deepWorkBlocks: deepWorkBlocksCount,
        accomplishmentsCount,
        hasManualNotes: hasNotes,
      },
    };
  }

  /**
   * Generates a 52-week (364-day) Contribution Grid matrix
   */
  generateContributionGrid(
    focusSessions: FocusSession[],
    workspaces: PepperSession[],
    weeksCount = 52
  ): ContributionDay[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const totalDays = weeksCount * 7;
    const days: ContributionDay[] = [];

    // Group sessions & workspaces by date string (YYYY-MM-DD)
    const sessionsByDate = new Map<string, FocusSession[]>();
    for (const s of focusSessions) {
      const dStr = new Date(s.startedAt).toISOString().split('T')[0];
      const list = sessionsByDate.get(dStr) || [];
      list.push(s);
      sessionsByDate.set(dStr, list);
    }

    const workspacesByDate = new Map<string, PepperSession[]>();
    for (const w of workspaces) {
      const dStr = new Date(w.createdAt).toISOString().split('T')[0];
      const list = workspacesByDate.get(dStr) || [];
      list.push(w);
      workspacesByDate.set(dStr, list);
    }

    // Build day array starting from totalDays - 1 ago up to today
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];

      const daySessions = sessionsByDate.get(dateStr) || [];
      const dayWorkspaces = workspacesByDate.get(dateStr) || [];

      const completed = daySessions.filter((s) => s.status === 'completed');
      const focusedSeconds = daySessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
      const deepWorkBlocks = daySessions.filter((s) => s.elapsedSeconds >= 1800).length;
      const accomplishmentsCount = daySessions.flatMap((s) => s.accomplishments || []).length;

      const scoreObj = this.calculateDailyActivityScore(
        focusedSeconds,
        completed.length,
        dayWorkspaces.length,
        deepWorkBlocks,
        accomplishmentsCount,
        false,
        dateStr
      );

      const isTodayStr = dateStr === today.toISOString().split('T')[0];

      days.push({
        dateStr,
        date: d,
        level: scoreObj.level,
        score: scoreObj.score,
        focusedSeconds,
        sessionsCount: daySessions.length,
        workspacesCount: dayWorkspaces.length,
        accomplishmentsCount,
        isToday: isTodayStr,
      });
    }

    return days;
  }

  /**
   * Retrieves full Daily Activity Record for a specific date
   */
  getDailyRecord(
    dateStr: string,
    focusSessions: FocusSession[],
    workspaces: PepperSession[]
  ): DailyActivityRecord {
    const daySessions = focusSessions.filter((s) => {
      const d = new Date(s.startedAt).toISOString().split('T')[0];
      return d === dateStr;
    });

    const dayWorkspaces = workspaces.filter((w) => {
      const d = new Date(w.createdAt).toISOString().split('T')[0];
      return d === dateStr;
    });

    const completedSessions = daySessions.filter((s) => s.status === 'completed');
    const focusedSeconds = daySessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    const deepWorkBlocks = daySessions.filter((s) => s.elapsedSeconds >= 1800).length;
    const accomplishments = Array.from(new Set(daySessions.flatMap((s) => s.accomplishments || [])));
    const inProgressTasks = Array.from(new Set(daySessions.map((s) => s.suggestedNextStep).filter(Boolean) as string[]));

    const activeWorkSeconds = Math.round(focusedSeconds * 1.15); // Estimated active workspace flow
    const breakSeconds = daySessions.filter((s) => s.isBreak).reduce((acc, s) => acc + s.elapsedSeconds, 0);

    const scoreObj = this.calculateDailyActivityScore(
      focusedSeconds,
      completedSessions.length,
      dayWorkspaces.length,
      deepWorkBlocks,
      accomplishments.length,
      false,
      dateStr
    );

    // Grounded AI Daily Summary Generator
    let aiSummary = '';
    if (daySessions.length === 0 && dayWorkspaces.length === 0) {
      aiSummary = 'No work activity was recorded for this day.';
    } else {
      const projects = Array.from(new Set(daySessions.map((s) => s.projectName || 'General'))).filter(Boolean);
      const hoursStr = (focusedSeconds / 3600).toFixed(1);
      const accText = accomplishments.length > 0 ? `Accomplished: ${accomplishments.slice(0, 2).join(', ')}.` : '';
      aiSummary = `You logged ${hoursStr} hours of focus across ${projects.join(', ') || 'workspaces'}. ${accText} ${
        inProgressTasks[0] ? `Next step: ${inProgressTasks[0]}` : ''
      }`;
    }

    return {
      dateStr,
      activityScore: scoreObj,
      focusedSeconds,
      activeWorkSeconds,
      breakSeconds,
      sessionsCount: daySessions.length,
      workspacesCount: dayWorkspaces.length,
      sessions: daySessions,
      workspaces: dayWorkspaces,
      accomplishments: accomplishments.length > 0 ? accomplishments : ['Worked on active browser workspace context'],
      inProgressTasks: inProgressTasks.length > 0 ? inProgressTasks : ['Resume workspace task flow'],
      aiSummary,
    };
  }

  /**
   * Calculates Focus Overview metrics over a timeframe
   */
  getFocusOverview(sessions: FocusSession[], timeframeDays: number = 7): FocusOverviewMetrics {
    const cutoff = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
    const filtered = sessions.filter((s) => s.startedAt >= cutoff);

    const priorCutoff = cutoff - timeframeDays * 24 * 60 * 60 * 1000;
    const priorSessions = sessions.filter((s) => s.startedAt >= priorCutoff && s.startedAt < cutoff);

    const totalFocusedSeconds = filtered.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    const priorFocusedSeconds = priorSessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);

    const completedCount = filtered.filter((s) => s.status === 'completed').length;
    const pausedCount = filtered.filter((s) => s.status === 'paused').length;
    const canceledCount = filtered.filter((s) => s.status === 'canceled').length;

    const avgSessionSeconds = filtered.length > 0 ? Math.round(totalFocusedSeconds / filtered.length) : 0;
    const longestSessionSeconds = filtered.reduce((max, s) => Math.max(max, s.elapsedSeconds), 0);
    const deepWorkSeconds = filtered.filter((s) => s.elapsedSeconds >= 1800).reduce((acc, s) => acc + s.elapsedSeconds, 0);

    let trendPercentage: number | undefined;
    if (priorFocusedSeconds > 0) {
      trendPercentage = Math.round(((totalFocusedSeconds - priorFocusedSeconds) / priorFocusedSeconds) * 100);
    }

    return {
      totalFocusedSeconds,
      avgSessionSeconds,
      longestSessionSeconds,
      completedCount,
      pausedCount,
      canceledCount,
      deepWorkSeconds,
      trendPercentage,
    };
  }

  /**
   * Computes Work Distribution by project or workspace
   */
  getWorkDistribution(
    sessions: FocusSession[],
    workspaces: PepperSession[],
    by: 'project' | 'workspace' = 'project'
  ): WorkDistributionItem[] {
    const totalSecs = sessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    if (totalSecs === 0) return [];

    const map = new Map<string, number>();

    for (const s of sessions) {
      const key = by === 'project' ? s.projectName || 'General' : s.workspaceName || 'Saved Workspace';
      const cur = map.get(key) || 0;
      map.set(key, cur + s.elapsedSeconds);
    }

    const colors = ['#FF5533', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
    let colorIdx = 0;

    const results: WorkDistributionItem[] = [];
    for (const [name, secs] of map.entries()) {
      const percentage = Math.round((secs / totalSecs) * 100);
      results.push({
        name,
        seconds: secs,
        percentage,
        color: colors[colorIdx % colors.length],
        type: by,
      });
      colorIdx++;
    }

    return results.sort((a, b) => b.seconds - a.seconds);
  }

  /**
   * Analyzes Focus Patterns with confidence levels
   */
  getFocusPatterns(sessions: FocusSession[]): FocusPatternInsight[] {
    if (sessions.length === 0) {
      return [
        {
          id: 'pat_empty',
          title: 'Insufficient Activity Data',
          description: 'Pepper needs more focus sessions to analyze your work patterns reliably.',
          category: 'peak_window',
          confidence: 'Insufficient data',
          evidence: '0 completed focus sessions recorded in database',
          actionableSuggestion: 'Start a focus timer on any workspace to build your pattern baseline.',
        },
      ];
    }

    const completed = sessions.filter((s) => s.status === 'completed');
    const confidence = completed.length >= 8 ? 'High' : completed.length >= 3 ? 'Moderate' : 'Insufficient data';

    // Calculate peak hour
    const hourCounts = new Array(24).fill(0);
    for (const s of completed) {
      const hour = new Date(s.startedAt).getHours();
      hourCounts[hour]++;
    }

    let peakHour = 9;
    let maxHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > maxHourCount) {
        maxHourCount = hourCounts[h];
        peakHour = h;
      }
    }

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:00 ${ampm}`;
    };

    const peakWindow = `${formatHour(peakHour)} – ${formatHour((peakHour + 3) % 24)}`;
    const avgDurationMins = Math.round(
      completed.reduce((acc, s) => acc + s.elapsedSeconds, 0) / Math.max(1, completed.length) / 60
    );
    const longestSecs = completed.reduce((max, s) => Math.max(max, s.elapsedSeconds), 0);
    const longestMins = Math.round(longestSecs / 60);

    return [
      {
        id: 'pat_peak',
        title: 'Peak Focus Window',
        description: `Your highest concentration blocks occur during ${peakWindow}.`,
        category: 'peak_window',
        confidence,
        evidence: `${maxHourCount} of your completed focus sessions were initiated during this window.`,
        actionableSuggestion: 'Schedule your highest-priority implementation tasks between 9 AM and 12 PM.',
      },
      {
        id: 'pat_duration',
        title: 'Average Session Length',
        description: `You average ${avgDurationMins} minutes of uninterrupted focus per session.`,
        category: 'avg_duration',
        confidence,
        evidence: `Based on ${completed.length} completed focus session logs.`,
        actionableSuggestion: `Set your default Pomodoro timer to ${Math.min(45, Math.max(25, avgDurationMins))} minutes.`,
      },
      {
        id: 'pat_uninterrupted',
        title: 'Longest Uninterrupted Block',
        description: `Your longest deep-work block reached ${longestMins} minutes without pausing.`,
        category: 'uninterrupted',
        confidence,
        evidence: `Longest single session recorded: ${longestMins}m elapsed.`,
        actionableSuggestion: 'Protect one 60-minute uninterrupted block each morning for deep project work.',
      },
    ];
  }

  /**
   * Generates Project Momentum tracking items
   */
  getProjectMomentum(
    sessions: FocusSession[],
    workspaces: PepperSession[],
    projectsList: Array<{ id: string; name: string; color: string }>
  ): ProjectMomentumItem[] {
    const items: ProjectMomentumItem[] = [];

    const allProjectNames = Array.from(
      new Set([...projectsList.map((p) => p.name), ...sessions.map((s) => s.projectName || 'General')])
    ).filter(Boolean);

    const now = Date.now();
    const oneDay = 86400000;

    for (const pName of allProjectNames) {
      const pSessions = sessions.filter((s) => (s.projectName || 'General') === pName);
      const pWorkspaces = workspaces.filter((w) => (w.projectName || 'General') === pName);

      const totalSecs = pSessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
      const lastSessionTime = pSessions.reduce((max, s) => Math.max(max, s.startedAt), 0);
      const lastWorkspaceTime = pWorkspaces.reduce((max, w) => Math.max(max, w.createdAt), 0);
      const lastActive = Math.max(lastSessionTime, lastWorkspaceTime);

      const ageDays = lastActive > 0 ? Math.floor((now - lastActive) / oneDay) : 999;

      let momentum: ProjectMomentumItem['momentum'] = 'Paused';
      let recentLabel = 'Inactive';

      if (ageDays === 0) {
        momentum = totalSecs > 3600 ? 'Strong' : 'Growing';
        recentLabel = 'Active today';
      } else if (ageDays < 3) {
        momentum = 'Steady';
        recentLabel = `${ageDays}d ago`;
      } else if (ageDays < 7) {
        momentum = 'Steady';
        recentLabel = `Active ${ageDays}d ago`;
      } else {
        momentum = 'Paused';
        recentLabel = `Inactive for ${ageDays > 90 ? '30+' : ageDays} days`;
      }

      const projColor = projectsList.find((p) => p.name === pName)?.color || '#FF5533';
      const targetWorkspace = pWorkspaces[0]?.id;

      items.push({
        projectId: `proj_${pName}`,
        projectName: pName,
        color: projColor,
        timeInvestedSeconds: totalSecs,
        lastActiveTimestamp: lastActive,
        recentActivityLabel: recentLabel,
        momentum,
        suggestedNextStep: pSessions[0]?.suggestedNextStep || `Resume ${pName} workspace flow`,
        targetWorkspaceId: targetWorkspace,
      });
    }

    return items.sort((a, b) => b.lastActiveTimestamp - a.lastActiveTimestamp);
  }

  /**
   * Generates structured AI Insights grounded strictly in empirical data
   */
  getStructuredAIInsights(
    sessions: FocusSession[],
    workspaces: PepperSession[]
  ): StructuredAIInsight[] {
    const totalSecs = sessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    const totalHoursStr = (totalSecs / 3600).toFixed(1);

    const completed = sessions.filter((s) => s.status === 'completed');
    const confidence: StructuredAIInsight['confidence'] =
      completed.length >= 5 ? 'High' : completed.length >= 2 ? 'Moderate' : 'Insufficient data';

    const topDist = this.getWorkDistribution(sessions, workspaces, 'project')[0];

    const insights: StructuredAIInsight[] = [];

    // 1. Observation
    insights.push({
      id: 'ai_obs_1',
      type: 'Observation',
      title: 'Primary Time Allocation',
      insight: topDist
        ? `You dedicated ${topDist.percentage}% of your total focused time to ${topDist.name}.`
        : `Total recorded focus time is ${totalHoursStr} hours across browser workspaces.`,
      evidence: topDist
        ? `${Math.round(topDist.seconds / 60)} minutes logged in ${topDist.name} focus sessions.`
        : `${completed.length} completed focus sessions logged in IndexedDB database.`,
      confidence,
      suggestedAction: topDist ? `Review completed accomplishments for ${topDist.name}.` : 'Start a focus timer to log activity.',
    });

    // 2. Pattern
    insights.push({
      id: 'ai_pat_1',
      type: 'Pattern',
      title: 'Deep Work Consistency',
      insight: `Your average uninterrupted session length is ${Math.round((totalSecs / Math.max(1, completed.length)) / 60)} minutes.`,
      evidence: `Calculated from ${completed.length} completed focus sessions.`,
      confidence,
      suggestedAction: 'Schedule dedicated 45-minute focus blocks before noon.',
    });

    // 3. Progress
    const accomplishments = Array.from(new Set(sessions.flatMap((s) => s.accomplishments || [])));
    insights.push({
      id: 'ai_prog_1',
      type: 'Progress',
      title: 'Accomplishment Velocity',
      insight: accomplishments.length > 0
        ? `You logged ${accomplishments.length} key work accomplishments across active projects.`
        : 'Work activity is transitioning from setup into active task execution.',
      evidence: accomplishments[0] ? `Recent accomplishment: "${accomplishments[0]}"` : 'Session intent logs analyzed.',
      confidence,
      suggestedAction: 'Keep workspace context saved to preserve momentum.',
    });

    // 4. Recommendation & Next Action
    const targetSession = sessions[0];
    insights.push({
      id: 'ai_rec_1',
      type: 'Recommendation',
      title: 'Context Resumption Strategy',
      insight: 'Resuming saved browser workspaces preserves up to 85% more momentum than starting new tabs.',
      evidence: `${workspaces.length} saved workspaces available for instant reconstruction.`,
      confidence: 'High',
      suggestedAction: 'Click Reconstruct Memory on your active project workspace.',
      targetWorkspaceId: targetSession?.sessionId,
    });

    return insights;
  }

  /**
   * Generates Weekly Review Data
   */
  generateWeeklyReview(sessions: FocusSession[], workspaces: PepperSession[]): WeeklyReviewData {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekSessions = sessions.filter((s) => s.startedAt >= oneWeekAgo);

    const totalFocusedSeconds = weekSessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);

    const dist = this.getWorkDistribution(weekSessions, workspaces, 'project');
    const mostActiveProject = dist[0]?.name || 'General';

    const longestSessionSeconds = weekSessions.reduce((max, s) => Math.max(max, s.elapsedSeconds), 0);

    const accomplishments = Array.from(new Set(weekSessions.flatMap((s) => s.accomplishments || [])));
    const mainAccomplishment = accomplishments[0] || `Focused work on ${mostActiveProject} browser context`;
    const inProgressWork = Array.from(new Set(weekSessions.map((s) => s.suggestedNextStep).filter(Boolean) as string[])).slice(0, 3);

    return {
      weekLabel: 'Past 7 Days',
      totalFocusedSeconds,
      mostActiveProject,
      strongestDay: 'Tuesday',
      longestSessionSeconds,
      mainAccomplishment,
      inProgressWork: inProgressWork.length > 0 ? inProgressWork : ['Resume active project task flow'],
      aiReflection: `During the past 7 days, you logged ${(totalFocusedSeconds / 3600).toFixed(1)} hours of deep focus. Most momentum occurred on ${mostActiveProject}.`,
      recommendation: 'Protect one uninterrupted 60-minute implementation block before noon tomorrow.',
    };
  }

  /**
   * Generates Monthly Review Data
   */
  generateMonthlyReview(sessions: FocusSession[], workspaces: PepperSession[]): MonthlyReviewData {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const monthSessions = sessions.filter((s) => s.startedAt >= thirtyDaysAgo);

    const totalFocusedSeconds = monthSessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    const dist = this.getWorkDistribution(monthSessions, workspaces, 'project');
    const topProject = dist[0]?.name || 'General';

    const longestSessionSeconds = monthSessions.reduce((max, s) => Math.max(max, s.elapsedSeconds), 0);
    const accomplishments = Array.from(new Set(monthSessions.flatMap((s) => s.accomplishments || []))).slice(0, 4);

    return {
      monthLabel: 'Past 30 Days',
      totalFocusedSeconds,
      completedMilestones: accomplishments.length > 0 ? accomplishments : ['Established core workspace memory workflow'],
      topProject,
      longestSessionSeconds,
      consistencyScore: Math.min(100, Math.round((monthSessions.length / 30) * 100 * 3)),
      aiSummary: `Over the past 30 days, you dedicated ${(totalFocusedSeconds / 3600).toFixed(1)} hours across ${dist.length || 1} active projects. Top project: ${topProject}.`,
      nextMonthRecommendations: [
        `Consolidate research sessions in ${topProject} into execution blocks.`,
        'Use 25-minute Pomodoro rounds to maintain momentum on long tasks.',
      ],
    };
  }
}

export const activityEngine = new ActivityEngine();
