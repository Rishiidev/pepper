import { CLEARED_FOCUS_STATE, StoredFocusState, elapsedSeconds, endTimeMs, focusBadgeText, remainingSeconds } from './focus-timing';
import { focusEngine } from './focus-engine';
import { sessionEngine } from './session-engine';

export const FOCUS_STATE_KEY = 'pepper_active_focus_state';
const END_ALARM = 'pepper_focus_end';
const TICK_ALARM = 'pepper_focus_tick';
const FOCUS_BADGE_COLOR = '#FF3B30';

export async function readFocusState(): Promise<StoredFocusState | null> {
  try {
    const res = await chrome.storage.local.get(FOCUS_STATE_KEY);
    return (res[FOCUS_STATE_KEY] as StoredFocusState | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Schedules (or clears) the end-of-timer and badge alarms to match the stored state. */
export async function syncFocusAlarms(): Promise<void> {
  if (!chrome.alarms) return;
  const state = await readFocusState();
  const now = Date.now();

  if (!state || !state.isRunning || state.isPaused || !state.activeSession) {
    await chrome.alarms.clear(END_ALARM);
    await chrome.alarms.clear(TICK_ALARM);
    await sessionEngine.refreshBadge();
    return;
  }

  const end = endTimeMs(state, now);
  if (end !== null) chrome.alarms.create(END_ALARM, { when: end });
  else await chrome.alarms.clear(END_ALARM);
  chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await updateFocusBadge(state);
}

export async function updateFocusBadge(state?: StoredFocusState | null): Promise<void> {
  const s = state ?? (await readFocusState());
  if (!s || !s.isRunning || !s.activeSession || !chrome.action) return;
  await chrome.action.setBadgeBackgroundColor({ color: FOCUS_BADGE_COLOR });
  await chrome.action.setBadgeText({ text: s.isPaused ? '❚❚' : focusBadgeText(s, Date.now()) });
}

/** Finishes a countdown whose time is up, even if no Pepper page is open. */
export async function completeFocusIfDue(): Promise<boolean> {
  const state = await readFocusState();
  if (!state || !state.isRunning || state.isPaused || !state.activeSession) return false;
  const rem = remainingSeconds(state, Date.now());
  if (rem === null || rem > 0) return false;

  const session = state.activeSession;
  await chrome.storage.local.set({ [FOCUS_STATE_KEY]: CLEARED_FOCUS_STATE });
  await focusEngine.completeSession(session.id, elapsedSeconds(state, Date.now()) || session.durationSeconds);
  await chrome.alarms?.clear(END_ALARM);
  await chrome.alarms?.clear(TICK_ALARM);

  try {
    chrome.notifications?.create(`pepper_focus_done_${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'Focus session complete',
      message: `${Math.round(session.durationSeconds / 60)} minutes${session.workspaceName ? ` on ${session.workspaceName}` : ''}. Time for a break.`,
      priority: 2,
    });
  } catch {
    // non-fatal
  }
  await sessionEngine.refreshBadge();
  return true;
}

export async function handleFocusAlarm(name: string): Promise<void> {
  if (name === END_ALARM) {
    await completeFocusIfDue();
  } else if (name === TICK_ALARM) {
    if (!(await completeFocusIfDue())) await updateFocusBadge();
  }
}
