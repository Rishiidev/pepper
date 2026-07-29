import { providerRegistry } from '../registry/provider-registry';
import { ModelProvider } from '../interfaces/provider';
import { CapabilityRequirements } from '../interfaces/capability';
import { IntelligenceError } from '../interfaces/errors';
import { IntelligenceTask, TaskResult } from '../interfaces/task';
import { AI_LIMITS } from '../utils/token-budget';

export class AIRouter {
  private static instance: AIRouter;

  private constructor() {}

  static getInstance(): AIRouter {
    if (!AIRouter.instance) {
      AIRouter.instance = new AIRouter();
    }
    return AIRouter.instance;
  }

  async resolveProvider(requirements: CapabilityRequirements, overrideProviderId?: string): Promise<ModelProvider> {
    if (!providerRegistry.getIsHydrated()) {
      await providerRegistry.hydrateFromStorage();
    }

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
    const provider = await this.resolveProvider(task.requirements, overrideProviderId);

    const limits = AI_LIMITS as Record<string, number>;
    // Try both task.skillId or a lookup fallback
    const matchedKey = Object.keys(limits).find(
      (k) => k.toLowerCase() === task.skillId.toLowerCase() || task.skillId.toLowerCase().includes(k.toLowerCase())
    );
    const initialMaxTokens = matchedKey ? limits[matchedKey] : 250;

    let attempts = 0;
    const maxAttempts = 3;
    let currentMaxTokens = initialMaxTokens;
    const rawPrompt = typeof task.input === 'string' ? task.input : JSON.stringify(task.input);

    while (attempts < maxAttempts) {
      try {
        const rawResponse = await provider.chat(rawPrompt, { maxTokens: currentMaxTokens });
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
        attempts++;
        const errMsg = (err as Error).message || '';
        const isTokenCreditError =
          errMsg.includes('402') ||
          errMsg.toLowerCase().includes('credit') ||
          errMsg.toLowerCase().includes('token');

        if (isTokenCreditError && attempts < maxAttempts) {
          currentMaxTokens = Math.max(8, Math.round(currentMaxTokens * 0.5));
          console.warn(
            `[AIRouter] Attempt ${attempts} failed with token/credit error. Retrying with 50% reduced maxTokens = ${currentMaxTokens}...`
          );
          continue;
        }

        const durationMs = Date.now() - startTime;
        return {
          taskId: task.id,
          success: false,
          error: errMsg,
          providerId: provider.id,
          durationMs,
        };
      }
    }

    return {
      taskId: task.id,
      success: false,
      error: 'Max retry attempts exceeded',
      providerId: provider.id,
      durationMs: Date.now() - startTime,
    };
  }
}

export const aiRouter = AIRouter.getInstance();
