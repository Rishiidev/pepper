import { PepperSession } from './session';
import { FocusSession } from './focus-session';

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface WorkActivityScore {
  score: number; // 0 - 100
  level: ActivityLevel;
  levelLabel: 'No work recorded' | 'Light activity' | 'Focused activity' | 'Strong progress' | 'High-impact work';
  dateStr: string; // YYYY-MM-DD
  factors: {
    focusedMinutes: number;
    completedSessions: number;
    workspacesResumed: number;
    deepWorkBlocks: number;
    accomplishmentsCount: number;
    hasManualNotes: boolean;
  };
}

export interface DailyActivityRecord {
  dateStr: string; // YYYY-MM-DD
  activityScore: WorkActivityScore;
  focusedSeconds: number;
  activeWorkSeconds: number;
  breakSeconds: number;
  sessionsCount: number;
  workspacesCount: number;
  sessions: FocusSession[];
  workspaces: PepperSession[];
  accomplishments: string[];
  inProgressTasks: string[];
  aiSummary?: string;
  manualNotes?: string;
}

export interface ContributionDay {
  dateStr: string;
  date: Date;
  level: ActivityLevel;
  score: number;
  focusedSeconds: number;
  sessionsCount: number;
  workspacesCount: number;
  accomplishmentsCount: number;
  isToday: boolean;
}

export interface FocusOverviewMetrics {
  totalFocusedSeconds: number;
  avgSessionSeconds: number;
  longestSessionSeconds: number;
  completedCount: number;
  pausedCount: number;
  canceledCount: number;
  deepWorkSeconds: number; // Sum of sessions >= 30 mins
  trendPercentage?: number; // % change vs prior period
}

export interface WorkDistributionItem {
  name: string;
  seconds: number;
  percentage: number;
  color: string;
  type: 'project' | 'workspace';
}

export interface FocusPatternInsight {
  id: string;
  title: string;
  description: string;
  category: 'peak_window' | 'avg_duration' | 'uninterrupted' | 'context_switch' | 'break_pattern';
  confidence: 'High' | 'Moderate' | 'Insufficient data';
  evidence: string;
  actionableSuggestion: string;
}

export interface ProjectMomentumItem {
  projectId: string;
  projectName: string;
  color: string;
  timeInvestedSeconds: number;
  lastActiveTimestamp: number;
  recentActivityLabel: string;
  momentum: 'Strong' | 'Growing' | 'Steady' | 'Paused';
  suggestedNextStep: string;
  targetWorkspaceId?: string;
}

export type AIInsightType = 'Observation' | 'Pattern' | 'Progress' | 'Risk' | 'Recommendation' | 'NextAction';

export interface StructuredAIInsight {
  id: string;
  type: AIInsightType;
  title: string;
  insight: string;
  evidence: string;
  confidence: 'High' | 'Moderate' | 'Insufficient data';
  suggestedAction: string;
  targetWorkspaceId?: string;
}

export interface WeeklyReviewData {
  weekLabel: string;
  totalFocusedSeconds: number;
  mostActiveProject: string;
  strongestDay: string;
  longestSessionSeconds: number;
  mainAccomplishment: string;
  inProgressWork: string[];
  aiReflection: string;
  recommendation: string;
}

export interface MonthlyReviewData {
  monthLabel: string;
  totalFocusedSeconds: number;
  completedMilestones: string[];
  topProject: string;
  longestSessionSeconds: number;
  consistencyScore: number;
  aiSummary: string;
  nextMonthRecommendations: string[];
}
