import { describe, it, expect } from 'vitest';
import { applyEvent, checklist, emptyActivation, shouldAskForReview } from '../activation';

describe('activation', () => {
  it('starts with install complete (endowed progress)', () => {
    const c = checklist(emptyActivation());
    expect(c.filter((x) => x.done).map((x) => x.id)).toEqual(['install']);
  });
  it('counts events and records the first time once', () => {
    let s = applyEvent(emptyActivation(), 'save', 100);
    s = applyEvent(s, 'save', 200);
    expect(s.counts.save).toBe(2);
    expect(s.firstAt.save).toBe(100);
    expect(checklist(s).find((x) => x.id === 'save')?.done).toBe(true);
  });
  it('asks for a review once, after the third restore', () => {
    let s = emptyActivation();
    for (let i = 0; i < 2; i++) s = applyEvent(s, 'restore');
    expect(shouldAskForReview(s)).toBe(false);
    s = applyEvent(s, 'restore');
    expect(shouldAskForReview(s)).toBe(true);
    expect(shouldAskForReview({ ...s, reviewPromptShown: true })).toBe(false);
  });
});
