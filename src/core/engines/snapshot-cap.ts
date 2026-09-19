import { WindowTabSnapshot } from '../types/snapshot';
import { PepperTab } from '../types/session';

/** Total serialized budget for all persisted window snapshots. */
export const SNAPSHOT_BUDGET_BYTES = 4 * 1024 * 1024;

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 120;
const MAX_FAVICON_LENGTH = 300;

function slimTab(tab: PepperTab, level: number): PepperTab {
  const favicon = tab.favIconUrl || '';
  return {
    ...tab,
    url: tab.url.slice(0, MAX_URL_LENGTH),
    title: (tab.title || '').slice(0, level >= 2 ? 60 : MAX_TITLE_LENGTH),
    favIconUrl: level >= 1 || favicon.startsWith('data:') || favicon.length > MAX_FAVICON_LENGTH ? '' : favicon,
  };
}

function size(snapshots: Record<number, WindowTabSnapshot>): number {
  return JSON.stringify(snapshots).length;
}

/** Keeps the active tab, pinned tabs and then the earliest tabs, up to `limit`. */
function limitTabs(snap: WindowTabSnapshot, limit: number): WindowTabSnapshot {
  if (snap.tabs.length <= limit) return snap;
  const active = snap.tabs[snap.activeTabIndex];
  const keep = new Set<PepperTab>();
  if (active) keep.add(active);
  for (const t of snap.tabs) if (t.pinned && keep.size < limit) keep.add(t);
  for (const t of snap.tabs) if (keep.size < limit) keep.add(t);
  const tabs = snap.tabs.filter((t) => keep.has(t));
  return { ...snap, tabs, activeTabIndex: Math.max(0, active ? tabs.indexOf(active) : 0) };
}

/**
 * Shrinks snapshots until they fit the byte budget, degrading gracefully:
 * slim every tab, drop favicons, shorten titles, then cap tabs per window.
 * Never mutates the input.
 */
export function capSnapshots(
  input: Record<number, WindowTabSnapshot>,
  budget: number = SNAPSHOT_BUDGET_BYTES
): Record<number, WindowTabSnapshot> {
  const levels: Array<{ level: number; maxTabs: number }> = [
    { level: 0, maxTabs: Infinity },
    { level: 1, maxTabs: Infinity },
    { level: 2, maxTabs: Infinity },
    { level: 2, maxTabs: 500 },
    { level: 2, maxTabs: 200 },
    { level: 2, maxTabs: 50 },
  ];

  let result: Record<number, WindowTabSnapshot> = input;
  for (const { level, maxTabs } of levels) {
    result = {};
    for (const [id, snap] of Object.entries(input)) {
      const slimmed: WindowTabSnapshot = { ...snap, tabs: snap.tabs.map((t) => slimTab(t, level)) };
      result[Number(id)] = limitTabs(slimmed, maxTabs);
    }
    if (size(result) <= budget) return result;
  }
  return result;
}
