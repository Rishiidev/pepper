import { ModelProvider, ProviderHealth } from '../interfaces/provider';
import { TaskCapability } from '../interfaces/capability';
import { IntelligenceError } from '../interfaces/errors';
import { keyVaultRepo } from '../../../storage/repositories/key-vault-repo';
import { OpenAIProvider } from '../providers/openai';
import { AnthropicProvider } from '../providers/anthropic';
import { GeminiProvider } from '../providers/gemini';
import { OllamaProvider } from '../providers/ollama';
import { OpenRouterProvider } from '../providers/openrouter';
import { MockProvider } from '../providers/mock-provider';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ModelProvider>();
  private activeProviderId: string | null = null;
  private isHydrated = false;

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  async hydrateFromStorage(): Promise<void> {
    try {
      console.log('[ProviderRegistry] Hydrating BYOK providers from storage...');
      const configs = await keyVaultRepo.getAll();
      const savedActiveId = await keyVaultRepo.getActiveProviderId();

      let registeredCount = 0;

      for (const [id, cfg] of Object.entries(configs)) {
        if (!cfg.enabled) continue;

        let provider: ModelProvider | null = null;

        if (id === 'openrouter' && cfg.apiKey) {
          provider = new OpenRouterProvider({ apiKey: cfg.apiKey, model: cfg.model });
        } else if (id === 'openai' && cfg.apiKey) {
          provider = new OpenAIProvider({ apiKey: cfg.apiKey, model: cfg.model, endpoint: cfg.endpoint });
        } else if (id === 'anthropic' && cfg.apiKey) {
          provider = new AnthropicProvider({ apiKey: cfg.apiKey, model: cfg.model });
        } else if (id === 'gemini' && cfg.apiKey) {
          provider = new GeminiProvider({ apiKey: cfg.apiKey, model: cfg.model });
        } else if (id === 'ollama') {
          provider = new OllamaProvider({ endpoint: cfg.endpoint, model: cfg.model });
        }

        if (provider) {
          this.register(provider);
          registeredCount++;
        }
      }

      // If zero BYOK providers configured, register MockProvider as testing fallback
      if (registeredCount === 0) {
        this.register(new MockProvider());
        this.activeProviderId = 'mock-provider-offline';
      } else if (savedActiveId && this.providers.has(savedActiveId)) {
        this.activeProviderId = savedActiveId;
      } else {
        const remaining = Array.from(this.providers.keys());
        this.activeProviderId = remaining[0] || 'mock-provider-offline';
      }

      this.isHydrated = true;
      console.log(`[ProviderRegistry] Hydrated ${registeredCount} providers. Active: ${this.activeProviderId}`);
    } catch (err) {
      console.error('[ProviderRegistry] Failed to hydrate providers from storage:', err);
    }
  }

  register(provider: ModelProvider): void {
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
    keyVaultRepo.setActiveProviderId(providerId);
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
