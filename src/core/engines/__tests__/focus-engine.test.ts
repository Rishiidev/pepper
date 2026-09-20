import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb, mkTab } from './test-db';

const execute = vi.hoisted(() =>
  vi.fn(async () => ({ success: true, data: { summary: 'done', accomplishments: ['a'], suggestedNextStep: 'next' } }))
);
vi.mock('../../intelligence/skills/focus-summary', () => ({
  FocusSummarySkill: class {
    id = 'focus-summary';
    requirements = {};
    execute = execute;
  },
}));

import { db } from '../../../storage/db';
import { focusEngine } from '../focus-engine';
import { PepperSession } from '../../types/session';

const memory: PepperSession = {
  id: 'ws1', name: 'Work', tabs: [mkTab('https://a.com')], tabCount: 1, createdAt: 1, isFavorite: false, captureType: 'manual',
};

beforeEach(async () => {
  await resetDb();
  execute.mockClear();
});

describe('focusEngine', () => {
  it('completes once when several contexts finish the timer at the same moment (regression)', async () => {
    const s = await focusEngine.startSession(memory, 'timer', 25);
    const results = await Promise.all([
      focusEngine.completeSession(s.id, 1500),
      focusEngine.completeSession(s.id, 1500),
      focusEngine.completeSession(s.id, 1500),
    ]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.status === 'completed')).toBe(true);
    const stored = await db.focusSessions.get(s.id);
    expect(stored?.status).toBe('completed');
    expect(stored?.aiSummary).toBe('done');
    expect(await db.focusSessions.count()).toBe(1);
  });

  it('does not resurrect a canceled session', async () => {
    const s = await focusEngine.startSession(memory, 'timer', 25);
    await focusEngine.cancelSession(s.id, 10);
    const res = await focusEngine.completeSession(s.id, 1500);
    expect(res.status).toBe('canceled');
    expect(execute).not.toHaveBeenCalled();
  });

  it('pause then resume returns the stored status to active', async () => {
    const s = await focusEngine.startSession(memory, 'pomodoro', 25);
    await focusEngine.pauseSession(s.id, 30);
    expect((await db.focusSessions.get(s.id))?.status).toBe('paused');
    await focusEngine.resumeSession(s.id, 30);
    const after = await db.focusSessions.get(s.id);
    expect(after?.status).toBe('active');
    expect(after?.elapsedSeconds).toBe(30);
  });

  it('resume leaves a completed session alone', async () => {
    const s = await focusEngine.startSession(memory, 'timer', 1);
    await focusEngine.completeSession(s.id, 60);
    await focusEngine.resumeSession(s.id, 60);
    expect((await db.focusSessions.get(s.id))?.status).toBe('completed');
  });
});
