import { useCallback, useEffect, useState } from 'react';
import { TimelineEvent } from '../../core/types/timeline';
import { timelineStore } from '../../core/engines/timeline-store';
import { dayBounds } from '../../core/engines/timeline-replay';

/** Events for the current day, refreshed when the recorder writes or every 30 seconds. */
export function useTodayTimeline(): { events: TimelineEvent[]; reload: () => void } {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const reload = useCallback(async () => {
    const { from, to } = dayBounds(Date.now());
    setEvents(await timelineStore.getEventsBetween(from, to));
  }, []);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), 30_000);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.pepper_timeline_updated) void reload();
    };
    chrome.storage?.onChanged.addListener(onChanged);
    return () => {
      clearInterval(timer);
      chrome.storage?.onChanged.removeListener(onChanged);
    };
  }, [reload]);

  return { events, reload };
}
