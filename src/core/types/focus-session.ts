export type FocusMode = 'pomodoro' | 'timer' | 'stopwatch';
export type FocusStatus = 'active' | 'paused' | 'completed' | 'canceled';
export type UserReflection = 'great' | 'good' | 'okay' | 'difficult';

export interface FocusSession {
  id: string;

  /** Mandatory Workspace / Memory link */
  sessionId: string;
  workspaceName: string;
  projectName?: string;

  mode: FocusMode;
  durationSeconds: number; // Target duration (e.g. 1500 for 25m Pomodoro)
  elapsedSeconds: number;  // Actual seconds worked
  status: FocusStatus;

  startedAt: number;
  endedAt?: number;

  // Pomodoro-specific fields
  pomodoroRound?: number;
  totalRounds?: number;
  isBreak?: boolean;

  // AI & Reflection Output
  aiSummary?: string;
  accomplishments?: string[];
  suggestedNextStep?: string;
  visitedDomains?: string[];
  tabsVisitedCount?: number;

  userReflection?: UserReflection;
  userNotes?: string;
}

export interface DailyJournal {
  id: string; // e.g. "journal_2026-07-29"
  dateStr: string; // "YYYY-MM-DD"
  totalFocusedSeconds: number;
  sessionsCount: number;
  projectsWorkedOn: string[];
  completedTasks: string[];
  inProgressTasks: string[];
  aiReflection: string;
  momentumScore: number;
}

export interface WeeklyReport {
  weekLabel: string;
  totalFocusedSeconds: number;
  sessionsCount: number;
  projectsWorkedOn: Array<{ name: string; seconds: number }>;
  mostProductiveDay: string;
  longestSessionSeconds: number;
  deepWorkHours: number;
  contextSwitchesCount: number;
  achievements: string[];
  aiSuggestions: string[];
}

export interface MomentumScore {
  score: number; // 0 to 100
  label: string; // "High Velocity", "Steady Flow", "Building Focus"
  factors: {
    focusConsistency: number;
    resumptionRate: number;
    uninterruptedRatio: number;
    taskCompletion: number;
  };
  explanation: string;
}

export interface AIPattern {
  id: string;
  title: string;
  description: string;
  category: 'timing' | 'productivity' | 'focus' | 'interruption';
  actionableSuggestion: string;
}
