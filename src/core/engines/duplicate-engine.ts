import { PepperSession, PepperTab } from '../types/session';
import { sessionEngine } from './session-engine';

export interface DuplicatePair {
  sessionA: PepperSession;
  sessionB: PepperSession;
  overlapCount: number;
  similarityScore: number;
  sharedUrls: string[];
}

export class DuplicateEngine {
  findDuplicates(sessions: PepperSession[], threshold = 0.3): DuplicatePair[] {
    const targetSessions = sessions.length > 200 ? sessions.slice(0, 200) : sessions;
    const pairs: DuplicatePair[] = [];

    // Pre-calculate cleaned URL sets to avoid re-parsing inside the loop
    const sessionUrlSets = targetSessions.map((s) => ({
      session: s,
      urls: new Set(s.tabs.map((t) => this.cleanUrl(t.url)).filter(Boolean)),
    }));

    for (let i = 0; i < sessionUrlSets.length; i++) {
      for (let j = i + 1; j < sessionUrlSets.length; j++) {
        const { session: sA, urls: urlsA } = sessionUrlSets[i];
        const { session: sB, urls: urlsB } = sessionUrlSets[j];

        if (urlsA.size === 0 || urlsB.size === 0) continue;

        const sharedUrls: string[] = [];
        for (const u of urlsA) {
          if (urlsB.has(u)) sharedUrls.push(u);
        }

        if (sharedUrls.length > 0) {
          const unionSize = new Set([...urlsA, ...urlsB]).size;
          const score = sharedUrls.length / Math.max(unionSize, 1);

          if (score >= threshold || sharedUrls.length >= 2) {
            pairs.push({
              sessionA: sA,
              sessionB: sB,
              overlapCount: sharedUrls.length,
              similarityScore: Math.round(score * 100),
              sharedUrls,
            });
          }
        }
      }
    }

    return pairs.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  async mergeWorkspaces(sessionA: PepperSession, sessionB: PepperSession): Promise<PepperSession> {
    const combinedTabsMap = new Map<string, PepperTab>();

    for (const tab of [...sessionA.tabs, ...sessionB.tabs]) {
      const key = this.cleanUrl(tab.url);
      if (key && !combinedTabsMap.has(key)) {
        combinedTabsMap.set(key, tab);
      }
    }

    const mergedTabs = Array.from(combinedTabsMap.values());
    const mergedName = `${sessionA.name} & ${sessionB.name}`;
    const mergedProject = sessionA.projectName || sessionB.projectName || 'General';

    // Create merged session
    const mergedSession = await sessionEngine.createSession(mergedName, mergedTabs, {
      projectName: mergedProject,
      isFavorite: sessionA.isFavorite || sessionB.isFavorite,
      isPinned: sessionA.isPinned || sessionB.isPinned,
    });

    // Delete originals
    await sessionEngine.deleteSession(sessionA.id);
    await sessionEngine.deleteSession(sessionB.id);

    return mergedSession;
  }

  private cleanUrl(url: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname}`.replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  }
}

export const duplicateEngine = new DuplicateEngine();
