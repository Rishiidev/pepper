import { describe, it, expect } from 'vitest';
import { capSnapshots } from '../snapshot-cap';
import { WindowTabSnapshot } from '../../types/snapshot';

function bigWindow(count: number, favicon = ''): WindowTabSnapshot {
  return {
    activeTabIndex: count - 1,
    capturedAt: 1,
    tabs: Array.from({ length: count }, (_, i) => ({
      id: i,
      index: i,
      url: `https://example.com/page/${i}?q=${'x'.repeat(200)}`,
      title: `Tab number ${i} ${'y'.repeat(150)}`,
      favIconUrl: favicon,
      pinned: i === 0,
    })),
  };
}

describe('capSnapshots', () => {
  it('leaves small windows untouched except trimming', () => {
    const out = capSnapshots({ 1: bigWindow(5) }, 1_000_000);
    expect(out[1].tabs).toHaveLength(5);
    expect(out[1].tabs[0].title.length).toBeLessThanOrEqual(120);
  });

  it('drops huge data-URL favicons first', () => {
    const out = capSnapshots({ 1: bigWindow(3, 'data:image/png;base64,' + 'A'.repeat(50_000)) }, 1_000_000);
    expect(out[1].tabs.every((t) => t.favIconUrl === '')).toBe(true);
  });

  it('fits hundreds of tabs into the budget and keeps the active tab', () => {
    const budget = 100_000;
    const out = capSnapshots({ 1: bigWindow(800) }, budget);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(budget);
    const snap = out[1];
    expect(snap.tabs[snap.activeTabIndex].url).toContain('/page/799');
    expect(snap.tabs.some((t) => t.pinned)).toBe(true);
  });

  it('does not mutate its input', () => {
    const input = { 1: bigWindow(10, 'data:x') };
    const before = JSON.stringify(input);
    capSnapshots(input, 1_000);
    expect(JSON.stringify(input)).toBe(before);
  });
});
