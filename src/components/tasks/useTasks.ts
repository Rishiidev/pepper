import { useLiveQuery } from 'dexie-react-hooks';
import { taskEngine } from '../../core/engines/task-engine';
import { PepperTask } from '../../core/types/task';

const NONE: PepperTask[] = [];

/** Every task, sorted. Updates on its own when a task changes in any Pepper page or the background. */
export function useTasks(): PepperTask[] {
  return useLiveQuery(() => taskEngine.list(), [], NONE);
}
