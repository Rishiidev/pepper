/** Shape written to chrome.storage.local by the focus store (only the fields timing needs). */
export interface StoredFocusState {
  activeSession: { id: string; mode: 'pomodoro' | 'timer' | 'stopwatch'; durationSeconds: number; workspaceName?: string } | null;
  isRunning: boolean;
  isPaused: boolean;
  _startedAtWallClock: number | null;
  _pausedAtWallClock: number | null;
  _totalPausedMs: number;
}

export const CLEARED_FOCUS_STATE = {
  activeSession: null,
  activeMemory: null,
  isRunning: false,
  isPaused: false,
  elapsedSeconds: 0,
  _startedAtWallClock: null,
  _pausedAtWallClock: null,
  _totalPausedMs: 0,
};

/** Seconds of focus actually worked, excluding paused time. */
export function elapsedSeconds(state: StoredFocusState, now: number): number {
  if (state._startedAtWallClock === null) return 0;
  const currentPause = state.isPaused && state._pausedAtWallClock ? now - state._pausedAtWallClock : 0;
  return Math.max(0, Math.floor((now - state._startedAtWallClock - state._totalPausedMs - currentPause) / 1000));
}

/** Seconds left on a countdown, or null for stopwatch mode. */
export function remainingSeconds(state: StoredFocusState, now: number): number | null {
  const s = state.activeSession;
  if (!s || s.mode === 'stopwatch' || s.durationSeconds <= 0) return null;
  return Math.max(0, s.durationSeconds - elapsedSeconds(state, now));
}

/** Wall-clock time the countdown will finish, assuming no more pauses. */
export function endTimeMs(state: StoredFocusState, now: number): number | null {
  const rem = remainingSeconds(state, now);
  return rem === null ? null : now + rem * 1000;
}

/** Toolbar badge text: whole minutes left, or minutes elapsed for a stopwatch. */
export function focusBadgeText(state: StoredFocusState, now: number): string {
  const rem = remainingSeconds(state, now);
  const minutes = rem === null ? Math.floor(elapsedSeconds(state, now) / 60) : Math.ceil(rem / 60);
  return `${minutes}m`;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
