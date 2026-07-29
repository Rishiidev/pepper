import { PepperSession } from '../types/session';

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

export class SearchEngine {
  /**
   * Basic filtered search — preserves existing behavior.
   */
  search(sessions: PepperSession[], options: SearchOptions): PepperSession[] {
    const ranked = this.rankedSearch(sessions, options);
    return ranked.map((r) => r.session);
  }

  /**
   * Ranked search with relevance scoring.
   * Searches across: name, summary, sessionIntent, project, tags,
   * tab titles, tab URLs, and domain clusters.
   * Results are ranked by: relevance score × recency boost.
   */
  rankedSearch(sessions: PepperSession[], options: SearchOptions): RankedResult[] {
    const { query = '', projectFilter, favoritesOnly, pinnedOnly } = options;
    const cleanQuery = query.toLowerCase().trim();
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);

    const results: RankedResult[] = [];

    for (const session of sessions) {
      // Hard filters (unchanged)
      if (favoritesOnly && !session.isFavorite) continue;
      if (pinnedOnly && !session.isPinned) continue;
      if (projectFilter && session.projectName !== projectFilter) continue;

      // No query → include all with recency score only
      if (!cleanQuery) {
        results.push({
          session,
          score: this.recencyScore(session),
          matchReason: 'all',
        });
        continue;
      }

      // Score each session against the query
      let score = 0;
      let matchReason = '';

      // 1. Session name match (highest weight)
      const nameScore = this.fuzzyScore(session.name, queryWords);
      if (nameScore > 0) {
        score += nameScore * 10;
        matchReason = 'name';
      }

      // 2. AI session intent match (high weight — this is the memory engine signal)
      if (session.sessionIntent) {
        const intentScore = this.fuzzyScore(session.sessionIntent, queryWords);
        if (intentScore > 0) {
          score += intentScore * 8;
          matchReason = matchReason || 'intent';
        }
      }

      // 3. Summary match
      if (session.summary) {
        const summaryScore = this.fuzzyScore(session.summary, queryWords);
        if (summaryScore > 0) {
          score += summaryScore * 6;
          matchReason = matchReason || 'summary';
        }
      }

      // 4. Project name match
      if (session.projectName) {
        const projectScore = this.fuzzyScore(session.projectName, queryWords);
        if (projectScore > 0) {
          score += projectScore * 5;
          matchReason = matchReason || 'project';
        }
      }

      // 5. Tags match
      if (session.tags) {
        for (const tag of session.tags) {
          const tagScore = this.fuzzyScore(tag, queryWords);
          if (tagScore > 0) {
            score += tagScore * 4;
            matchReason = matchReason || 'tag';
          }
        }
      }

      // 6. Domain clusters match
      if (session.domainClusters) {
        for (const domain of session.domainClusters) {
          const domainScore = this.fuzzyScore(domain, queryWords);
          if (domainScore > 0) {
            score += domainScore * 3;
            matchReason = matchReason || 'domain';
          }
        }
      }

      // 7. Tab titles match (broad sweep)
      for (const tab of session.tabs) {
        const titleScore = this.fuzzyScore(tab.title, queryWords);
        if (titleScore > 0) {
          score += titleScore * 2;
          matchReason = matchReason || 'tab_title';
        }

        // 8. Tab URL match (lowest weight)
        const urlScore = this.fuzzyScore(tab.url, queryWords);
        if (urlScore > 0) {
          score += urlScore * 1;
          matchReason = matchReason || 'tab_url';
        }
      }

      if (score > 0) {
        // Apply recency boost: recent sessions get a multiplier
        const recency = this.recencyScore(session);
        score *= recency;

        results.push({ session, score, matchReason });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Fuzzy matching score: counts how many query words appear in the target string.
   * Returns a 0-1 score based on the fraction of matching words.
   */
  private fuzzyScore(target: string, queryWords: string[]): number {
    if (!target || queryWords.length === 0) return 0;
    const lower = target.toLowerCase();
    let matches = 0;
    for (const word of queryWords) {
      if (lower.includes(word)) matches++;
    }
    return matches / queryWords.length;
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
