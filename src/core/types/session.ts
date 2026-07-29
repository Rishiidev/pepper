export interface PepperTab {
  id?: number;
  url: string;
  title: string;
  favIconUrl: string;
  index: number;
  pinned?: boolean;
}

export type CaptureType = 'manual' | 'auto_window_close' | 'auto_idle' | 'keyboard_shortcut';

export interface PepperSession {
  id: string;
  name: string;
  tabs: PepperTab[];
  tabCount: number;
  createdAt: number;
  updatedAt?: number;
  isFavorite: boolean;
  isPinned?: boolean;
  projectName?: string;
  tags?: string[];
  summary?: string;
  timeWorkedMinutes?: number;
  windowId?: number;
  estimatedRamSavedMb?: number;

  // === Memory Engine Fields ===

  /** How this workspace was captured */
  captureType: CaptureType;

  /** Index of the tab the user was actively viewing when captured */
  activeTabIndex?: number;

  /** Seconds spent on each tab (keyed by tab index) */
  tabDurations?: Record<number, number>;

  /** Ordered trail of URLs the user navigated through in this session */
  navigationTrail?: string[];

  /** AI-generated session intent: "researching X", "comparing Y", "debugging Z" */
  sessionIntent?: string;

  /** Domain clusters detected in this workspace */
  domainClusters?: string[];

  // === Workspace Context Fields ===
  clipboardSnippet?: string;
  recentDownloads?: string[];
  recentActivity?: string[];
}

export type TimelineGroup = 'pinned' | 'today' | 'yesterday' | 'this_week' | 'older';

export interface GroupedTimeline {
  pinned: PepperSession[];
  today: PepperSession[];
  yesterday: PepperSession[];
  this_week: PepperSession[];
  older: PepperSession[];
}

export interface SessionStats {
  totalSessions: number;
  totalTabsSaved: number;
  estimatedRamSavedMb: number;
  storageBytesUsed: number;
  autoCaptures: number;
  manualCaptures: number;
}
