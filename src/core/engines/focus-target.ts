import { PepperSession } from '../types/session';
import { workspaceMembership } from './workspace-membership';
import { sessionEngine } from './session-engine';
import { PepperTask } from '../types/task';

export const OPEN_FOCUS_ID = 'focus_open';

/** A focus session that is not tied to a saved workspace ("just focus"). */
export function openFocusTarget(): PepperSession {
  return {
    id: OPEN_FOCUS_ID,
    name: 'Open focus',
    tabs: [],
    tabCount: 0,
    createdAt: Date.now(),
    isFavorite: false,
    captureType: 'manual',
    projectName: 'General',
  };
}

/** Where a one-click Pomodoro is attributed: the active workspace, else open focus. */
export async function getFocusTarget(): Promise<PepperSession> {
  return (await workspaceMembership.getActiveWorkspace()) ?? openFocusTarget();
}

/** A task's own workspace when it still exists, otherwise the usual target. */
export async function getFocusTargetForTask(task: Pick<PepperTask, 'workspaceId'>): Promise<PepperSession> {
  if (task.workspaceId) {
    const own = await sessionEngine.getSessionById(task.workspaceId);
    if (own) return own;
  }
  return getFocusTarget();
}
