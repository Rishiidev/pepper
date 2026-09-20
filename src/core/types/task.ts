/** A to-do item. Local only; optionally linked to a workspace and a page. */
export interface PepperTask {
  id: string;
  title: string;
  done: boolean;
  /** Workspace this task belongs to. May point at a workspace that was since deleted. */
  workspaceId?: string;
  /** The page the task came from (http or https only). */
  url?: string;
  createdAt: number;
  /** Last change, used to pick the newer copy when a backup is imported. */
  updatedAt: number;
  doneAt?: number;
}

/** The part of a task a focus session remembers. */
export interface FocusTask {
  id: string;
  title: string;
}
