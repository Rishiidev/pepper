import { describe, it, expect } from 'vitest';
import { searchEngine } from '../search-engine';
import { parseQuery, editDistance, wordMatch } from '../search-text';
import { PepperSession } from '../../types/session';

const DAY = 86_400_000;

function session(id: string, name: string, titles: string[], extra: Partial<PepperSession> = {}): PepperSession {
  return {
    id,
    name,
    tabs: titles.map((t, i) => ({ url: `https://site${i}.com/${t.replace(/\s/g, '-')}`, title: t, favIconUrl: '', index: i })),
    tabCount: titles.length,
    createdAt: Date.now() - 40 * DAY,
    isFavorite: false,
    captureType: 'manual',
    ...extra,
  };
}

const corpus = [
  session('pricing', 'Competitor Pricing Research', ['Stripe Pricing', 'Plans and billing - Chargebee']),
  session('checkout', 'Shopify Checkout', ['Shopify checkout extensibility', 'Cart API reference']),
  session('bug', 'Login Bug', ['Fix auth redirect - Stack Overflow', 'OAuth callback error']),
  session('travel', 'Lisbon Trip', ['Flights to Lisbon', 'Hotels in Alfama - Booking.com']),
];

const top = (q: string, sessions = corpus) => searchEngine.rankedSearch(sessions, { query: q })[0]?.session.id;

describe('parseQuery', () => {
  it('drops filler words from natural language', () => {
    expect(parseQuery('that pricing research from my last session').tokens).toEqual(['pricing', 'research']);
  });

  it('extracts time phrases', () => {
    const { tokens, time } = parseQuery('yesterday shopify');
    expect(tokens).toEqual(['shopify']);
    expect(time).toBeDefined();
    expect(parseQuery('3 days ago docs').time).toBeDefined();
  });

  it('keeps words when everything is a stopword', () => {
    expect(parseQuery('that thing').tokens.length).toBeGreaterThan(0);
  });
});

describe('fuzzy helpers', () => {
  it('measures edit distance with swaps', () => {
    expect(editDistance('pricing', 'pricnig')).toBe(1);
    expect(editDistance('abc', 'xyz', 3)).toBe(3);
  });
  it('matches stems, prefixes and typos', () => {
    expect(wordMatch('prices', 'price')).toBeGreaterThan(0.8);
    expect(wordMatch('shop', 'shopify')).toBeGreaterThan(0.8);
    expect(wordMatch('pricng', 'pricing')).toBeGreaterThan(0.5);
    expect(wordMatch('zebra', 'pricing')).toBe(0);
  });
});

describe('searchEngine', () => {
  it('finds by natural language', () => {
    expect(top('that pricing research')).toBe('pricing');
  });
  it('tolerates typos', () => {
    expect(top('pricng research')).toBe('pricing');
    expect(top('shopfy checkout')).toBe('checkout');
  });
  it('matches related words', () => {
    expect(top('cost of plans')).toBe('pricing');
    expect(top('error login')).toBe('bug');
  });
  it('matches tab titles and abbreviations', () => {
    expect(top('alfama')).toBe('travel');
    expect(top('shpfy')).toBe('checkout');
  });
  it('requires most tokens to match', () => {
    expect(searchEngine.rankedSearch(corpus, { query: 'pricing zebra unicorn' })).toHaveLength(0);
  });
  it('returns nothing for gibberish', () => {
    expect(searchEngine.rankedSearch(corpus, { query: 'qqqqzzzz' })).toHaveLength(0);
  });
  it('applies time phrases', () => {
    const recent = session('recent', 'Recent Docs', ['API docs'], { createdAt: Date.now() - 1000 });
    const old = session('old', 'Old Docs', ['API docs'], { createdAt: Date.now() - 30 * DAY });
    expect(top('today docs', [old, recent])).toBe('recent');
  });
  it('returns all sessions for an empty query and honors filters', () => {
    expect(searchEngine.rankedSearch(corpus, { query: '' })).toHaveLength(4);
    expect(searchEngine.rankedSearch(corpus, { query: '', favoritesOnly: true })).toHaveLength(0);
  });
});
