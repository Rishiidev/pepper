export interface PepperTab {
  id?: number;
  url: string;
  title: string;
  favIconUrl: string;
  index: number;
  pinned?: boolean;
}

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
}
