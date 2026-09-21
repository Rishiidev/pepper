import { describe, it, expect, afterEach } from 'vitest';
import { localDateStr } from '../../utils/date';
import { activityEngine } from '../activity-engine';
import type { FocusSession } from '../../types/focus-session';

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const session = (startedAt: number): FocusSession =>
  ({ id: 'f', sessionId: 's', workspaceName: 'w', projectName: 'p', mode: 'pomodoro', durationSeconds: 1500, elapsedSeconds: 1500, status: 'completed', startedAt }) as FocusSession;

describe('local date bucketing', () => {
  it('formats in the local zone, not UTC', () => {
    process.env.TZ = 'America/New_York';
    // 9pm New York on 1 Mar is already 2 Mar in UTC
    expect(localDateStr(new Date(2026, 2, 1, 21, 0).getTime())).toBe('2026-03-01');
    process.env.TZ = 'Asia/Kolkata';
    // 1am in India on 2 Mar is still 1 Mar in UTC
    expect(localDateStr(new Date(2026, 2, 2, 1, 0).getTime())).toBe('2026-03-02');
  });

  it('puts an evening session on today’s cell in the contribution grid', () => {
    process.env.TZ = 'America/New_York';
    const evening = new Date();
    evening.setHours(21, 0, 0, 0);
    const grid = activityEngine.generateContributionGrid([session(evening.getTime())], [], 4);
    const today = grid[grid.length - 1];
    expect(today.isToday).toBe(true);
    expect(today.dateStr).toBe(localDateStr(evening));
    expect(today.sessionsCount).toBe(1);
    expect(grid.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('has one cell per day with no repeats across a DST change', () => {
    process.env.TZ = 'America/New_York';
    const grid = activityEngine.generateContributionGrid([], [], 60);
    expect(new Set(grid.map((d) => d.dateStr)).size).toBe(grid.length);
  });
});
