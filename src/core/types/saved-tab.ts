export type SavedTabSource = 'keyboard-shortcut' | 'toolbar' | 'context-menu';
export type SavedTabStatus = 'saved' | 'restored' | 'archived';

export interface SavedTabRecord {
  id: string; // Pepper stable UUID
  url: string;
  title: string;
  faviconUrl?: string;
  savedAt: number;
  source: SavedTabSource;
  workspaceId: string;
  workspaceName?: string;
  originalWindowId?: number;
  originalTabIndex?: number;
  wasPinned: boolean;
  tabGroupId?: number;
  status: SavedTabStatus;
}
