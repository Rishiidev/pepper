import { db } from '../../storage/db';
import { PepperTask } from '../types/task';

export const MAX_TASK_TITLE = 200;

/** Collapses whitespace and caps the length. Returns '' when nothing usable is left. */
export function normalizeTaskTitle(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_TITLE);
}

/** Only web pages can be linked; anything else (javascript:, chrome://, data:) is dropped. */
export function cleanTaskUrl(raw?: string): string | undefined {
  if (!raw || !/^https?:\/\//i.test(raw)) return undefined;
  try {
    return new URL(raw).toString();
  } catch {
    return undefined;
  }
}

/** Open tasks first, oldest first so the list does not reshuffle; finished tasks after, newest first. */
export function sortTasks(tasks: PepperTask[]): PepperTask[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.done ? (b.doneAt ?? 0) - (a.doneAt ?? 0) : a.createdAt - b.createdAt;
  });
}

export function openTasks(tasks: PepperTask[], workspaceId?: string | null): PepperTask[] {
  return tasks.filter((t) => !t.done && (workspaceId === undefined || t.workspaceId === (workspaceId ?? undefined)));
}

/** Open task count per workspace id (tasks with no workspace are not counted). */
export function openCountsByWorkspace(tasks: PepperTask[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.done || !t.workspaceId) continue;
    counts.set(t.workspaceId, (counts.get(t.workspaceId) ?? 0) + 1);
  }
  return counts;
}

function newId(): string {
  const uid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `task_${uid}`;
}

export interface NewTask {
  title: string;
  workspaceId?: string | null;
  url?: string;
}

export class TaskEngine {
  /** Adds a task. Returns null when the title is empty. */
  async add(input: NewTask): Promise<PepperTask | null> {
    const title = normalizeTaskTitle(input.title);
    if (!title) return null;
    const now = Date.now();
    const task: PepperTask = {
      id: newId(),
      title,
      done: false,
      workspaceId: input.workspaceId || undefined,
      url: cleanTaskUrl(input.url),
      createdAt: now,
      updatedAt: now,
    };
    await db.tasks.add(task);
    return task;
  }

  /** "Add as task" for an open tab: the page title becomes the task, the address is kept. */
  async addFromTab(tab: { title?: string; url?: string }, workspaceId?: string | null): Promise<PepperTask | null> {
    const url = cleanTaskUrl(tab.url);
    if (!url) return null;
    return this.add({ title: tab.title || url, workspaceId, url });
  }

  /** Marks a task done or open again. Returns the updated task, or undefined if it no longer exists. */
  async setDone(id: string, done: boolean): Promise<PepperTask | undefined> {
    return db.transaction('rw', db.tasks, async () => {
      const task = await db.tasks.get(id);
      if (!task) return undefined;
      if (task.done === done) return task;
      const now = Date.now();
      const next: PepperTask = { ...task, done, updatedAt: now, doneAt: done ? now : undefined };
      await db.tasks.put(next);
      return next;
    });
  }

  async rename(id: string, title: string): Promise<void> {
    const clean = normalizeTaskTitle(title);
    if (!clean) return;
    await db.tasks.update(id, { title: clean, updatedAt: Date.now() });
  }

  async remove(id: string): Promise<PepperTask | undefined> {
    const task = await db.tasks.get(id);
    if (task) await db.tasks.delete(id);
    return task;
  }

  /** Puts a removed task back (Undo). */
  async restore(task: PepperTask): Promise<void> {
    await db.tasks.put(task);
  }

  async get(id: string): Promise<PepperTask | undefined> {
    return db.tasks.get(id);
  }

  async list(): Promise<PepperTask[]> {
    return sortTasks(await db.tasks.toArray());
  }

  async listForWorkspace(workspaceId: string): Promise<PepperTask[]> {
    return sortTasks(await db.tasks.where('workspaceId').equals(workspaceId).toArray());
  }
}

export const taskEngine = new TaskEngine();
