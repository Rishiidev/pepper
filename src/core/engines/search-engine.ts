import { PepperSession } from '../types/session';
import { parseQuery, synonymsOf, wordMatch, words } from './search-text';

export interface SearchOptions {
  query?: string;
  projectFilter?: string;
  favoritesOnly?: boolean;
  pinnedOnly?: boolean;
}

export interface RankedResult {
  session: PepperSession;
  score: number;
  matchReason: string;
}

/** Where in a session a token can match, with how much weight. */
const FIELD_WEIGHTS = {
  name: 10,
  intent: 8,
  summary: 6,
  project: 5,
  tag: 4,
  domain: 3,
  tab_title: 2,
  tab_url: 1,
} as const;

type Field = keyof typeof FIELD_WEIGHTS;

interface IndexedSession {
  fields: Record<Field, string[][]>; // each field is a list of texts, each text a list of words
  raw: Record<Field, string[]>;
}

const indexCache = new WeakMap<PepperSession, { key: number; index: IndexedSession }>();

function indexSession(session: PepperSession): IndexedSession {
  const key = (session.updatedAt ?? 0) + session.tabCount;
  const hit = indexCache.get(session);
  if (hit && hit.key === key) return hit.index;

  const raw: Record<Field, string[]> = {
    name: [session.name || ''],
    intent: session.sessionIntent ? [session.sessionIntent] : [],
    summary: session.summary ? [session.summary] : [],
    project: session.projectName ? [session.projectName] : [],
    tag: session.tags ?? [],
    domain: session.domainClusters ?? [],
    tab_title: session.tabs.map((t) => t.title || ''),
    tab_url: session.tabs.map((t) => t.url || ''),
  };
  const fields = Object.fromEntries(
    (Object.keys(raw) as Field[]).map((f) => [f, raw[f].map((text) => words(text))])
  ) as Record<Field, string[][]>;

  const index = { fields, raw };
  indexCache.set(session, { key, index });
  return index;
}

/** Best match of one query token against every text in a field, plus a small bonus for repeat hits. */
function scoreToken(token: string, index: IndexedSession, field: Field): number {
  const texts = index.fields[field];
  const dotted = token.includes('.');
  let best = 0;
  let hits = 0;

  for (let i = 0; i < texts.length; i++) {
    let m = 0;
    if (dotted && index.raw[field][i].toLowerCase().includes(token)) {
      m = 1;
    } else {
      for (const w of texts[i]) {
        const s = wordMatch(token, w);
        if (s > m) m = s;
        if (m === 1) break;
      }
      if (m < 0.6) {
        for (const syn of synonymsOf(token)) {
          for (const w of texts[i]) {
            const s = wordMatch(syn, w) * 0.65;
            if (s > m) m = s;
          }
        }
      }
    }
    if (m > 0) hits++;
    if (m > best) best = m;
  }
  if (best === 0) return 0;
  const repeatBonus = field === 'tab_title' || field === 'tab_url' ? Math.min(hits - 1, 5) * 0.03 : 0;
  return Math.min(1, best + repeatBonus);
}

export class SearchEngine {
  /**
   * Basic filtered search — preserves existing behavior.
   */
  search(sessions: PepperSession[], options: SearchOptions): PepperSession[] {
    return this.rankedSearch(sessions, options).map((r) => r.session);
  }

  /**
   * Local, offline ranked search. Understands typos ("pricng"), word forms
   * ("prices"), related words ("cost" ~ "pricing"), abbreviations ("shpfy")
   * and time phrases ("yesterday", "last week"). Ranked by relevance × recency.
   */
  rankedSearch(sessions: PepperSession[], options: SearchOptions): RankedResult[] {
    const { query = '', projectFilter, favoritesOnly, pinnedOnly } = options;
    const { tokens, time } = parseQuery(query);
    const hasQuery = tokens.length > 0;
    const results: RankedResult[] = [];

    for (const session of sessions) {
      if (favoritesOnly && !session.isFavorite) continue;
      if (pinnedOnly && !session.isPinned) continue;
      if (projectFilter && session.projectName !== projectFilter) continue;

      const inTime = !time || (session.createdAt >= time.from && session.createdAt < time.to);

      if (!hasQuery) {
        if (time && !inTime) continue;
        results.push({ session, score: this.recencyScore(session), matchReason: 'all' });
        continue;
      }

      const index = indexSession(session);
      const fieldTotals: Record<Field, number> = {
        name: 0, intent: 0, summary: 0, project: 0, tag: 0, domain: 0, tab_title: 0, tab_url: 0,
      };
      let total = 0;
      let matchedTokens = 0;

      for (const token of tokens) {
        let tokenBest = 0;
        let tokenRest = 0;
        for (const field of Object.keys(FIELD_WEIGHTS) as Field[]) {
          const contribution = scoreToken(token, index, field) * FIELD_WEIGHTS[field];
          if (contribution <= 0) continue;
          fieldTotals[field] += contribution;
          if (contribution > tokenBest) {
            tokenRest += tokenBest * 0.15;
            tokenBest = contribution;
          } else {
            tokenRest += contribution * 0.15;
          }
        }
        if (tokenBest > 0) matchedTokens++;
        total += tokenBest + tokenRest;
      }

      const needed = Math.ceil(tokens.length * 0.6);
      if (matchedTokens < needed) continue;

      const coverage = matchedTokens / tokens.length;
      let score = total * coverage * coverage * this.recencyScore(session);
      if (time) score *= inTime ? 2.5 : 0.4;
      if (session.isPinned) score *= 1.1;
      if (session.isFavorite) score *= 1.1;

      const matchReason = (Object.keys(fieldTotals) as Field[]).reduce((a, b) => (fieldTotals[b] > fieldTotals[a] ? b : a));
      results.push({ session, score, matchReason });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Recency multiplier: sessions from the last 24h get 2x,
   * last week gets 1.5x, last month 1.2x, older 1.0x.
   */
  private recencyScore(session: PepperSession): number {
    const ageMs = Date.now() - session.createdAt;
    const oneDay = 86400000;
    if (ageMs < oneDay) return 2.0;
    if (ageMs < oneDay * 7) return 1.5;
    if (ageMs < oneDay * 30) return 1.2;
    return 1.0;
  }
}

export const searchEngine = new SearchEngine();
