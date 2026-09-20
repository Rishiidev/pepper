/**
 * Local-only activation counters. They drive the "Get started" checklist and the
 * one-time review prompt. Nothing here is ever sent anywhere.
 */
export type ActivationEvent = 'save' | 'restore' | 'search' | 'focus' | 'timeline';

export interface ActivationState {
  counts: Record<ActivationEvent, number>;
  firstAt: Partial<Record<ActivationEvent, number>>;
  reviewPromptShown?: boolean;
  checklistDismissed?: boolean;
}

const KEY = 'pepper_activation_v1';

export const emptyActivation = (): ActivationState => ({
  counts: { save: 0, restore: 0, search: 0, focus: 0, timeline: 0 },
  firstAt: {},
});

export function applyEvent(state: ActivationState, event: ActivationEvent, now = Date.now()): ActivationState {
  return {
    ...state,
    counts: { ...state.counts, [event]: (state.counts[event] ?? 0) + 1 },
    firstAt: { ...state.firstAt, [event]: state.firstAt[event] ?? now },
  };
}

/** The checklist steps and whether each is done. "Installed" starts complete (endowed progress). */
export function checklist(state: ActivationState): Array<{ id: string; label: string; done: boolean }> {
  return [
    { id: 'install', label: 'Install Pepper', done: true },
    { id: 'save', label: 'Save a window', done: state.counts.save > 0 },
    { id: 'restore', label: 'Restore it', done: state.counts.restore > 0 },
    { id: 'search', label: 'Try search (⌘K)', done: state.counts.search > 0 },
    { id: 'focus', label: 'Start a focus session', done: state.counts.focus > 0 },
  ];
}

/** True once, after the third successful restore. */
export function shouldAskForReview(state: ActivationState): boolean {
  return state.counts.restore >= 3 && !state.reviewPromptShown;
}

export async function getActivation(): Promise<ActivationState> {
  try {
    const res = await chrome.storage.local.get(KEY);
    return { ...emptyActivation(), ...(res[KEY] as Partial<ActivationState> | undefined) };
  } catch {
    return emptyActivation();
  }
}

export async function recordActivation(event: ActivationEvent): Promise<void> {
  try {
    await chrome.storage.local.set({ [KEY]: applyEvent(await getActivation(), event) });
  } catch {
    // non-extension context
  }
}

export async function patchActivation(patch: Partial<ActivationState>): Promise<void> {
  try {
    await chrome.storage.local.set({ [KEY]: { ...(await getActivation()), ...patch } });
  } catch {
    // non-extension context
  }
}

export const ACTIVATION_KEY = KEY;
