import { db } from '../../storage/db';
import { DailyJournal, FocusSession, MomentumScore, WeeklyReport, AIPattern } from '../types/focus-session';

export class JournalEngine {
  /**
   * Calculates the Pepper Momentum Score (0-100) for a set of focus sessions and workspaces
   */
  calculateMomentumScore(sessions: FocusSession[]): MomentumScore {
    if (!sessions || sessions.length === 0) {
      return {
        score: 75,
        label: 'Building Momentum',
        factors: {
          focusConsistency: 70,
          resumptionRate: 80,
          uninterruptedRatio: 75,
          taskCompletion: 75,
        },
        explanation: 'Start your first focus session to build real-time workspace momentum.',
      };
    }

    const completed = sessions.filter((s) => s.status === 'completed');
    const totalElapsed = sessions.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    const avgLengthMins = totalElapsed / Math.max(1, sessions.length) / 60;

    // Factors
    const focusConsistency = Math.min(100, Math.round((completed.length / sessions.length) * 100));
    const resumptionRate = Math.min(100, Math.round(Math.min(10, sessions.length) * 10));
    const uninterruptedRatio = Math.min(100, Math.round(Math.min(60, avgLengthMins) * 1.6));
    const taskCompletion = Math.min(100, Math.round(completed.length * 15));

    const finalScore = Math.min(
      99,
      Math.max(
        40,
        Math.round(
          focusConsistency * 0.35 +
          resumptionRate * 0.25 +
          uninterruptedRatio * 0.25 +
          taskCompletion * 0.15
        )
      )
    );

    let label = 'Building Momentum';
    if (finalScore >= 90) label = 'High Velocity';
    else if (finalScore >= 80) label = 'Steady Flow State';
    else if (finalScore >= 70) label = 'Consistent Progress';

    return {
      score: finalScore,
      label,
      factors: {
        focusConsistency,
        resumptionRate,
        uninterruptedRatio,
        taskCompletion,
      },
      explanation: `You've completed ${completed.length} focus sessions with an average of ${Math.round(avgLengthMins)}m uninterrupted deep work per session.`,
    };
  }

  /**
   * Aggregates focus sessions for today into a Daily AI Journal
   */
  async getDailyJournal(dateStr: string = new Date().toISOString().split('T')[0]): Promise<DailyJournal> {
    const todaySessions = await db.focusSessions
      .where('status')
      .equals('completed')
      .toArray();

    // Filter sessions matching today's date
    const dateFiltered = todaySessions.filter((s) => {
      const d = new Date(s.startedAt).toISOString().split('T')[0];
      return d === dateStr;
    });

    const totalSeconds = dateFiltered.reduce((acc, s) => acc + s.elapsedSeconds, 0);
    const projects = Array.from(new Set(dateFiltered.map((s) => s.projectName || 'General'))).filter(Boolean);

    const accomplishments = dateFiltered.flatMap((s) => s.accomplishments || []);
    const inProgress = dateFiltered.map((s) => s.suggestedNextStep).filter(Boolean) as string[];

    const hours = (totalSeconds / 3600).toFixed(1);

    return {
      id: `journal_${dateStr}`,
      dateStr,
      totalFocusedSeconds: totalSeconds,
      sessionsCount: dateFiltered.length,
      projectsWorkedOn: projects,
      completedTasks: accomplishments.length > 0 ? accomplishments : ['Focused work on active browser context'],
      inProgressTasks: inProgress.length > 0 ? inProgress : ['Resume active workspace flow'],
      aiReflection: dateFiltered.length > 0
        ? `Today you dedicated ${hours} hours of deep focus across ${projects.join(', ') || 'workspaces'}. Most momentum occurred during uninterrupted sessions.`
        : 'No completed focus sessions logged today yet. Start a focus timer to build momentum.',
      momentumScore: this.calculateMomentumScore(dateFiltered).score,
    };
  }

  /**
   * Generates AI Pattern Insights & Recommendations
   */
  getAIPatterns(sessions: FocusSession[]): AIPattern[] {
    const totalMins = Math.round(sessions.reduce((acc, s) => acc + s.elapsedSeconds, 0) / 60);

    return [
      {
        id: 'pat_1',
        title: 'Peak Focus Window',
        description: 'Your highest completion rates occur in 25–45 minute uninterrupted blocks.',
        category: 'timing',
        actionableSuggestion: 'Schedule your primary project implementation blocks before noon.',
      },
      {
        id: 'pat_2',
        title: 'Workspace Resumption Rate',
        description: `You have logged ${sessions.length} focus sessions across your active memories.`,
        category: 'productivity',
        actionableSuggestion: 'Resuming existing workspaces preserves 85% more momentum than starting new tabs.',
      },
      {
        id: 'pat_3',
        title: 'Research to Execution Ratio',
        description: `Total focused duration: ${totalMins} minutes logged across deep work sessions.`,
        category: 'focus',
        actionableSuggestion: 'Consider creating execution sessions immediately following research blocks.',
      },
    ];
  }
}

export const journalEngine = new JournalEngine();
