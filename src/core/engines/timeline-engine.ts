import { PepperSession, GroupedTimeline } from '../types/session';

export class TimelineEngine {
  groupSessions(sessions: PepperSession[]): GroupedTimeline {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    const grouped: GroupedTimeline = {
      pinned: [],
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    };

    for (const session of sessions) {
      if (session.isPinned) {
        grouped.pinned.push(session);
        continue;
      }

      const created = session.createdAt;
      if (created >= startOfToday) {
        grouped.today.push(session);
      } else if (created >= startOfYesterday) {
        grouped.yesterday.push(session);
      } else if (created >= startOfThisWeek) {
        grouped.this_week.push(session);
      } else {
        grouped.older.push(session);
      }
    }

    return grouped;
  }
}

export const timelineEngine = new TimelineEngine();
