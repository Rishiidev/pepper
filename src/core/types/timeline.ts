export type TimelineEventType =
  | 'session_start'
  | 'session_end'
  | 'tab_open'
  | 'tab_navigate'
  | 'tab_switch'
  | 'tab_close'
  | 'tab_active'
  | 'idle_start'
  | 'idle_end';

/** One thing that happened in the browser, with a timestamp. Append-only. */
export interface TimelineEvent {
  id?: number;
  sessionId: string;
  ts: number;
  type: TimelineEventType;
  tabId?: number;
  windowId?: number;
  url?: string;
  title?: string;
  /** tab_active: milliseconds the user actively spent on `url` ending at `ts` */
  spentMs?: number;
  /** session_start: 'startup' | 'enabled' | 'window'; session_end: 'clean' | 'interrupted' */
  reason?: string;
}

/** From browser open to browser close. Workspaces are pulled out of these. */
export interface BrowserSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  /** clean = last window closed; interrupted = Chrome quit or crashed without a clean end */
  endReason?: 'clean' | 'interrupted';
  /** Updated by a heartbeat so an interrupted session has an end time */
  lastEventAt: number;
  startReason: 'startup' | 'enabled' | 'window';
}
