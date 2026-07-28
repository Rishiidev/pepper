import { PepperSession } from '../types/session';

export interface SearchOptions {
  query: string;
  projectFilter?: string;
  favoritesOnly?: boolean;
  pinnedOnly?: boolean;
}

export class SearchEngine {
  search(sessions: PepperSession[], options: SearchOptions): PepperSession[] {
    const { query, projectFilter, favoritesOnly, pinnedOnly } = options;
    const cleanQuery = query.toLowerCase().trim();

    return sessions.filter(session => {
      if (favoritesOnly && !session.isFavorite) return false;
      if (pinnedOnly && !session.isPinned) return false;
      if (projectFilter && session.projectName !== projectFilter) return false;

      if (!cleanQuery) return true;

      // 1. Session name match
      if (session.name.toLowerCase().includes(cleanQuery)) return true;

      // 2. Project name match
      if (session.projectName && session.projectName.toLowerCase().includes(cleanQuery)) return true;

      // 3. Tags match
      if (session.tags && session.tags.some(t => t.toLowerCase().includes(cleanQuery))) return true;

      // 4. Tab titles & URLs match
      return session.tabs.some(
        tab => tab.title.toLowerCase().includes(cleanQuery) || tab.url.toLowerCase().includes(cleanQuery)
      );
    });
  }
}

export const searchEngine = new SearchEngine();
