export type NamingMode = 'prefilled' | 'ask' | 'auto' | 'template';
export type SaveScope = 'window' | 'selected' | 'all_windows';
export type AppTheme = 'dark' | 'light' | 'system';

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
};
