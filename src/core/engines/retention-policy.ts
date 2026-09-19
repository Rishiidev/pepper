import { PepperSession, isAutoCapture } from '../types/session';
import { INBOX_SESSION_ID } from '../constants/ids';

const DAY_MS = 86_400_000;

export interface RetentionPolicy {
  /** Age-out threshold in days; 0 disables */
  retentionDays: number;
  /** Max auto-captures to keep, newest first; 0 disables */
  maxAutoCaptures: number;
  now?: number;
}

/** Auto-captures the user has taken ownership of are never deleted. */
function isProtected(s: PepperSession): boolean {
  return s.id === INBOX_SESSION_ID || !!s.isPinned || !!s.isFavorite;
}

/** Pure: returns the sessions that should be deleted under the policy. */
export function selectExpired(sessions: PepperSession[], policy: RetentionPolicy): PepperSession[] {
  const now = policy.now ?? Date.now();
  const candidates = sessions.filter((s) => isAutoCapture(s.captureType) && !isProtected(s));
  const expired = new Set<PepperSession>();

  if (policy.retentionDays > 0) {
    for (const s of candidates) {
      if (now - s.createdAt > policy.retentionDays * DAY_MS) expired.add(s);
    }
  }

  if (policy.maxAutoCaptures > 0) {
    const kept = candidates
      .filter((s) => !expired.has(s))
      .sort((a, b) => b.createdAt - a.createdAt);
    for (const s of kept.slice(policy.maxAutoCaptures)) expired.add(s);
  }

  return [...expired];
}

