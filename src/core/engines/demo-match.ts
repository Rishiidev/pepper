import { PepperSession, isAutoCapture } from '../types/session';

export const DEMO_URLS = [
  'https://en.wikipedia.org/wiki/Coffee',
  'https://en.wikipedia.org/wiki/Espresso',
  'https://en.wikipedia.org/wiki/Coffee_preparation',
];

/** Finds the auto-capture produced by closing the onboarding demo window. */
export function findDemoCapture(sessions: PepperSession[], since: number, urls: string[] = DEMO_URLS): PepperSession | undefined {
  return sessions
    .filter((s) => isAutoCapture(s.captureType) && s.createdAt >= since)
    .find((s) => {
      const have = new Set(s.tabs.map((t) => t.url));
      return urls.filter((u) => have.has(u) || [...have].some((h) => h.startsWith(u))).length >= 2;
    });
}
