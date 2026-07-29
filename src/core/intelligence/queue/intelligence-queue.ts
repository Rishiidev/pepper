import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { aiRouter } from '../router/ai-router';
import { intelligenceEventBus } from '../events/intelligence-events';

interface QueueItem<TInput = unknown, TOutput = unknown> {
  task: IntelligenceTask<TInput, TOutput>;
  resolve: (value: TaskResult<TOutput>) => void;
  reject: (reason?: unknown) => void;
  retryCount: number;
}

export class IntelligenceQueue {
  private static instance: IntelligenceQueue;
  private queue: QueueItem[] = [];
  private activeCount = 0;
  private concurrencyLimit = 3;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): IntelligenceQueue {
    if (!IntelligenceQueue.instance) {
      IntelligenceQueue.instance = new IntelligenceQueue();
    }
    return IntelligenceQueue.instance;
  }

  enqueue<TInput, TOutput>(task: IntelligenceTask<TInput, TOutput>): Promise<TaskResult<TOutput>> {
    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        task: task as unknown as IntelligenceTask,
        resolve: resolve as unknown as (value: TaskResult<unknown>) => void,
        reject,
        retryCount: 0,
      };

      // Priority ordering: HIGH > LOW > BACKGROUND > SCHEDULED
      if (task.priority === 'HIGH') {
        const insertIdx = this.queue.findIndex((q) => q.task.priority !== 'HIGH');
        if (insertIdx === -1) {
          this.queue.push(item);
        } else {
          this.queue.splice(insertIdx, 0, item);
        }
      } else {
        this.queue.push(item);
      }

      intelligenceEventBus.emit('task.queued', { taskId: task.id, priority: task.priority });
      this.processNext();
    });
  }

  private processNext(): void {
    while (this.activeCount < this.concurrencyLimit && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeCount++;

      (async () => {
        try {
          const result = await aiRouter.executeTask(item.task);

          if (!result.success && item.retryCount < (item.task.maxRetries ?? 2)) {
            item.retryCount++;
            console.warn(`[IntelligenceQueue] Retrying task ${item.task.id} (Attempt ${item.retryCount})`);
            this.queue.unshift(item);
          } else {
            if (result.success) {
              intelligenceEventBus.emit('task.completed', { taskId: item.task.id, durationMs: result.durationMs });
            } else {
              intelligenceEventBus.emit('task.failed', { taskId: item.task.id, error: result.error || 'Execution failed' });
            }
            item.resolve(result);
          }
        } catch (err) {
          intelligenceEventBus.emit('task.failed', { taskId: item.task.id, error: (err as Error).message });
          item.reject(err);
        } finally {
          this.activeCount--;
          this.processNext();
        }
      })();
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  clear(): void {
    this.queue = [];
  }
}

export const intelligenceQueue = IntelligenceQueue.getInstance();
