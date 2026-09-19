import { describe, it, expect } from 'vitest';
import { remainingSeconds, elapsedSeconds, endTimeMs, focusBadgeText, formatClock, StoredFocusState } from '../focus-timing';

const base = (over: Partial<StoredFocusState> = {}): StoredFocusState => ({
  activeSession: { id: 'f', mode: 'pomodoro', durationSeconds: 1500 },
  isRunning: true,
  isPaused: false,
  _startedAtWallClock: 0,
  _pausedAtWallClock: null,
  _totalPausedMs: 0,
  ...over,
});

describe('focus timing', () => {
  it('counts down from wall clock', () => {
    expect(remainingSeconds(base(), 60_000)).toBe(1440);
    expect(remainingSeconds(base(), 2_000_000)).toBe(0);
  });
  it('excludes paused time, including a pause in progress', () => {
    expect(elapsedSeconds(base({ _totalPausedMs: 30_000 }), 90_000)).toBe(60);
    expect(elapsedSeconds(base({ isPaused: true, _pausedAtWallClock: 60_000 }), 120_000)).toBe(60);
  });
  it('has no countdown for stopwatch mode', () => {
    const sw = base({ activeSession: { id: 'f', mode: 'stopwatch', durationSeconds: 0 } });
    expect(remainingSeconds(sw, 5000)).toBeNull();
    expect(endTimeMs(sw, 5000)).toBeNull();
    expect(focusBadgeText(sw, 12 * 60_000)).toBe('12m');
  });
  it('predicts the end time and rounds the badge up', () => {
    expect(endTimeMs(base(), 60_000)).toBe(1_500_000);
    expect(focusBadgeText(base(), 60_000)).toBe('24m');
    expect(focusBadgeText(base(), 1_499_000)).toBe('1m');
  });
  it('formats the clock', () => {
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(65)).toBe('01:05');
  });
});
