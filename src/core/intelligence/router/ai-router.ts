import { providerRegistry } from '../registry/provider-registry';
import { ModelProvider } from '../interfaces/provider';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceError } from '../interfaces/errors';
import { IntelligenceTask, TaskResult } from '../interfaces/task';

export class AIRouter {
  private static instance: AIRouter;

  private constructor() {}

  static getInstance(): AIRouter {
    if (!AIRouter.instance) {
      AIRouter.instance = new AIRouter();
    }
    return AIRouter.instance;
  }

  resolveProvider(requirements: CapabilityRequirements, overrideProviderId?: string): ModelProvider {
    if (overrideProviderId) {
      const provider = providerRegistry.getProvider(overrideProviderId);
      if (!provider) {
        throw new IntelligenceError(
          'NO_CAPABLE_PROVIDER',
          `Specified provider override '${overrideProviderId}' was not found.`
        );
      }
      if (!requirements.required.every((cap) => provider.supports(cap))) {
        throw new IntelligenceError(
          'CAPABILITY_UNSUPPORTED',
          `Provider '${overrideProviderId}' does not support required capabilities: ${requirements.required.join(', ')}`,
          provider.id
        );
      }
      return provider;
    }

    // 1. Try active provider if it matches requirements
    const active = providerRegistry.getActiveProvider();
    if (active && requirements.required.every((cap) => active.supports(cap))) {
      return active;
    }

    // 2. Search for any capable registered provider matching the required capabilities
    const capable = providerRegistry.findCapableProviders(requirements.required);
    if (capable.length === 0) {
      throw new IntelligenceError(
        'NO_CAPABLE_PROVIDER',
        `No registered AI provider supports required capabilities: [${requirements.required.join(', ')}]`
      );
    }

    return capable[0];
  }

  async executeTask<TInput, TOutput>(
    task: IntelligenceTask<TInput, TOutput>,
    overrideProviderId?: string
  ): Promise<TaskResult<TOutput>> {
    const startTime = Date.now();
    const provider = this.resolveProvider(task.requirements, overrideProviderId);

    try {
      const rawPrompt = typeof task.input === 'string' ? task.input : JSON.stringify(task.input);
      const rawResponse = await provider.chat(rawPrompt);

      const parsedData = task.parseOutput ? task.parseOutput(rawResponse) : (rawResponse as unknown as TOutput);

      return {
        taskId: task.id,
        success: true,
        data: parsedData,
        providerId: provider.id,
        durationMs: Date.now() - startTime,
        cached: false,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      if (err instanceof IntelligenceError) {
        return {
          taskId: task.id,
          success: false,
          error: err.message,
          providerId: provider.id,
          durationMs,
        };
      }
      return {
        taskId: task.id,
        success: false,
        error: (err as Error).message || 'Unknown execution error',
        providerId: provider.id,
        durationMs,
      };
    }
  }
}

export const aiRouter = AIRouter.getInstance();
