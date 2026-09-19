import { describe, it, expect } from 'vitest';
import { selectExpired } from '../retention-policy';
import { PepperSession } from '../../types/session';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

function s(id: string, ageDays: number, extra: Partial<PepperSession> = {}): PepperSession {
  return {
    id,
    name: id,
    tabs: [],
    tabCount: 0,
    createdAt: NOW - ageDays * DAY,
    isFavorite: false,
    captureType: 'auto_window_close',
    ...extra,
  };
}

describe('selectExpired', () => {
  it('ages out old auto-captures only', () => {
    const out = selectExpired(
      [s('old', 40), s('new', 2), s('manual-old', 90, { captureType: 'manual' })],
      { retentionDays: 30, maxAutoCaptures: 0, now: NOW }
    );
    expect(out.map((x) => x.id)).toEqual(['old']);
  });

  it('protects pinned, favorite and inbox', () => {
    const out = selectExpired(
      [s('p', 90, { isPinned: true }), s('f', 90, { isFavorite: true }), s('pepper_inbox', 90)],
      { retentionDays: 30, maxAutoCaptures: 0, now: NOW }
    );
    expect(out).toHaveLength(0);
  });

  it('caps the count keeping the newest', () => {
    const out = selectExpired([s('a', 1), s('b', 2), s('c', 3), s('d', 4)], {
      retentionDays: 0,
      maxAutoCaptures: 2,
      now: NOW,
    });
    expect(out.map((x) => x.id).sort()).toEqual(['c', 'd']);
  });

  it('treats crash recoveries as auto-captures', () => {
    const out = selectExpired([s('r', 50, { captureType: 'crash_recovery' })], {
      retentionDays: 30,
      maxAutoCaptures: 0,
      now: NOW,
    });
    expect(out).toHaveLength(1);
  });

  it('does nothing when both limits are disabled', () => {
    expect(selectExpired([s('x', 999)], { retentionDays: 0, maxAutoCaptures: 0, now: NOW })).toHaveLength(0);
  });
});
