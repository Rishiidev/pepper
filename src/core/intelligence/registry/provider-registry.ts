import { ModelProvider, ProviderHealth } from '../interfaces/provider';
import { TaskCapability } from '../interfaces/capability';
import { IntelligenceError } from '../interfaces/errors';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ModelProvider>();
  private activeProviderId: string | null = null;

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: ModelProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`[ProviderRegistry] Overwriting existing provider: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.id;
    }
  }

  unregister(providerId: string): boolean {
    const removed = this.providers.delete(providerId);
    if (this.activeProviderId === providerId) {
      const remaining = Array.from(this.providers.keys());
      this.activeProviderId = remaining.length > 0 ? remaining[0] : null;
    }
    return removed;
  }

  getProvider(providerId: string): ModelProvider | undefined {
    return this.providers.get(providerId);
  }

  getActiveProvider(): ModelProvider | undefined {
    if (!this.activeProviderId) return undefined;
    return this.providers.get(this.activeProviderId);
  }

  setActiveProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new IntelligenceError('NO_CAPABLE_PROVIDER', `Provider '${providerId}' is not registered`);
    }
    this.activeProviderId = providerId;
  }

  getAllProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  findCapableProviders(capabilities: TaskCapability[]): ModelProvider[] {
    return this.getAllProviders().filter((provider) =>
      capabilities.every((cap) => provider.supports(cap))
    );
  }

  async checkHealthAll(): Promise<Record<string, ProviderHealth>> {
    const results: Record<string, ProviderHealth> = {};
    for (const [id, provider] of this.providers.entries()) {
      try {
        results[id] = await provider.healthCheck();
      } catch (err) {
        results[id] = {
          isHealthy: false,
          lastChecked: Date.now(),
          errorMessage: (err as Error).message,
        };
      }
    }
    return results;
  }

  clear(): void {
    this.providers.clear();
    this.activeProviderId = null;
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
