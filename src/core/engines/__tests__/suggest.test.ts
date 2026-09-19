import { describe, it, expect } from 'vitest';
import { suggestFromTabs } from '../suggest-workspace';
import { PepperSession, PepperTab } from '../../types/session';

const tab = (url: string, title: string, i = 0): PepperTab => ({ url, title, favIconUrl: '', index: i });
const ws = (id: string, name: string, tabs: PepperTab[]): PepperSession => ({
  id, name, tabs, tabCount: tabs.length, createdAt: 1, isFavorite: false, captureType: 'manual',
});

const stripe = ws('w1', 'Stripe Webhooks', [
  tab('https://docs.stripe.com/webhooks', 'Webhooks | Stripe Docs'),
  tab('https://dashboard.stripe.com/events', 'Events - Stripe Dashboard'),
]);

describe('suggestFromTabs', () => {
  it('suggests adding related open tabs to an existing workspace', () => {
    const open = [
      tab('https://docs.stripe.com/api/events', 'Events API reference | Stripe Docs'),
      tab('https://stackoverflow.com/q/1', 'Verify stripe webhooks signature'),
      tab('https://stripe.com/blog/webhooks', 'Webhooks best practices - Stripe'),
      tab('https://news.ycombinator.com', 'Hacker News'),
    ];
    const s = suggestFromTabs(open, [stripe]);
    expect(s).toHaveLength(1);
    expect(s[0].kind).toBe('add');
    expect(s[0].workspaceId).toBe('w1');
    expect(s[0].tabs).toHaveLength(3);
  });

  it('suggests a new workspace around a shared topic', () => {
    const open = [
      tab('https://a.com/1', 'Lisbon hotels near Alfama'),
      tab('https://b.com/2', 'Flights to Lisbon in May'),
      tab('https://c.com/3', 'Lisbon travel guide'),
    ];
    const s = suggestFromTabs(open, []);
    expect(s).toHaveLength(1);
    expect(s[0].kind).toBe('create');
    expect(s[0].topic).toBe('Lisbon');
  });

  it('ignores tabs already saved in any workspace', () => {
    const open = [
      tab('https://docs.stripe.com/webhooks?x=1', 'Webhooks | Stripe Docs'),
      tab('https://a.com', 'x'), tab('https://b.com', 'y'),
    ];
    expect(suggestFromTabs(open, [stripe])).toHaveLength(0);
  });

  it('needs the minimum group size and respects dismissals', () => {
    const open = [tab('https://a.com/1', 'Lisbon hotels'), tab('https://b.com/2', 'Lisbon flights')];
    expect(suggestFromTabs(open, [])).toHaveLength(0);
    const three = [...open, tab('https://c.com/3', 'Lisbon guide')];
    const [s] = suggestFromTabs(three, []);
    expect(suggestFromTabs(three, [], { dismissed: new Set([s.key]) })).toHaveLength(0);
  });
});
