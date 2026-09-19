import { describe, it, expect } from 'vitest';
import { newTabsOnly, recentWorkspaces } from '../workspace-membership';
import { PepperSession, PepperTab } from '../../types/session';

const tab = (url: string): PepperTab => ({ url, title: url, favIconUrl: '', index: 0 });
const ws = (id: string, at: number): PepperSession => ({ id, name: id, tabs: [], tabCount: 0, createdAt: at, isFavorite: false, captureType: 'manual' });

describe('newTabsOnly', () => {
  it('drops tabs already in the workspace, ignoring query and hash', () => {
    const out = newTabsOnly([tab('https://a.com/x?y=1')], [tab('https://a.com/x#top'), tab('https://b.com')]);
    expect(out.map((t) => t.url)).toEqual(['https://b.com']);
  });
  it('dedupes within the incoming list and rejects unsaveable urls', () => {
    const out = newTabsOnly([], [tab('https://a.com'), tab('https://www.a.com/'), tab('chrome://settings'), tab('')]);
    expect(out).toHaveLength(1);
  });
});

describe('recentWorkspaces', () => {
  it('orders by recency, excludes the inbox and limits', () => {
    const out = recentWorkspaces([ws('old', 1), ws('pepper_inbox', 99), ws('new', 50), ws('mid', 10)], 2);
    expect(out.map((w) => w.id)).toEqual(['new', 'mid']);
  });
});
