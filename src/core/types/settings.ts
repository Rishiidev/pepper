export type NamingMode = 'prefilled' | 'ask' | 'auto' | 'template';
export type SaveScope = 'window' | 'selected' | 'all_windows';
export type AppTheme = 'dark' | 'light' | 'system';
export type QuickSaveDestination = 'inbox' | 'current_workspace' | 'ask';

export interface PepperSettings {
  namingMode: NamingMode;
  nameTemplate: string; // e.g. "{{project}} — {{date}} • {{time}}"
  defaultProjectName: string;
  saveScope: SaveScope;
  closeTabsOnSave: boolean;
  confirmDelete: boolean;
  theme: AppTheme;
  aiAutoNaming: boolean;
  selectedAiProvider: string;
  hasCompletedOnboarding?: boolean;

  // === Quick Save & Shortcut Settings ===
  quickSaveDestination: QuickSaveDestination;
  quickSaveFeedback: boolean;
  quickSaveEnableUndo: boolean;

  // === Auto-capture feedback & retention ===
  /** Show a quiet notification when a window is auto-captured */
  notifyOnAutoCapture: boolean;
  /** Delete unpinned, unfavorited auto-captures older than this many days (0 = keep forever) */
  autoCaptureRetentionDays: number;
  /** Keep at most this many auto-captures (0 = unlimited) */
  maxAutoCaptures: number;
}

export const DEFAULT_SETTINGS: PepperSettings = {
  namingMode: 'template',
  nameTemplate: '{{date}} — {{time}}',
  defaultProjectName: 'General',
  saveScope: 'window',
  closeTabsOnSave: true,
  confirmDelete: true,
  theme: 'dark',
  aiAutoNaming: false,
  selectedAiProvider: 'none',
  hasCompletedOnboarding: false,
  quickSaveDestination: 'inbox',
  quickSaveFeedback: true,
  quickSaveEnableUndo: true,
  notifyOnAutoCapture: true,
  autoCaptureRetentionDays: 30,
  maxAutoCaptures: 200,
};
