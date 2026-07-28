import { aiRouter } from './router/ai-router';
import { intelligenceCache } from './cache/intelligence-cache';
import { telemetryEngine } from './telemetry/telemetry-engine';
import { CapabilityRequirements } from './interfaces/capability';
import { IntelligenceTask, TaskResult } from './interfaces/task';

export class IntelligenceService {
  private static instance: IntelligenceService;

  private constructor() {}

  static getInstance(): IntelligenceService {
    if (!IntelligenceService.instance) {
      IntelligenceService.instance = new IntelligenceService();
    }
    return IntelligenceService.instance;
  }

  async executeTask<TInput, TOutput>(
    task: IntelligenceTask<TInput, TOutput>,
    options: {
      cacheKey?: string;
      workspaceId?: string;
      overrideProviderId?: string;
    } = {}
  ): Promise<TaskResult<TOutput>> {
    const startTime = Date.now();

    // 1. Check Cache
    if (options.cacheKey) {
      const cached = intelligenceCache.get<TOutput>(options.cacheKey);
      if (cached !== null) {
        await telemetryEngine.recordEvent({
          task: task.id,
          provider: 'cache',
          latencyMs: Date.now() - startTime,
          tokensEst: 0,
          costEstUsd: 0,
          cacheHit: true,
          status: 'success',
        });

        return {
          taskId: task.id,
          success: true,
          data: cached,
          providerId: 'cache',
          durationMs: Date.now() - startTime,
          cached: true,
        };
      }
    }

    // 2. Execute via AI Router
    const result = await aiRouter.executeTask(task, options.overrideProviderId);

    // 3. Record Telemetry
    await telemetryEngine.recordEvent({
      task: task.id,
      provider: result.providerId || 'unknown',
      latencyMs: result.durationMs,
      tokensEst: Math.round((typeof task.input === 'string' ? task.input.length : 100) / 4),
      costEstUsd: 0.0001,
      cacheHit: false,
      status: result.success ? 'success' : 'error',
      errorDetails: result.error,
    });

    // 4. Write to Cache if successful
    if (result.success && result.data !== undefined && options.cacheKey) {
      await intelligenceCache.set(options.cacheKey, result.data, options.workspaceId);
    }

    return result;
  }
}

export const intelligenceService = IntelligenceService.getInstance();
