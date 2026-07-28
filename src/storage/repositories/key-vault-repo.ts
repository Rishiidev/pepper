export interface ProviderConfig {
  id: string;
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  lastHealthCheck?: {
    isHealthy: boolean;
    lastChecked: number;
    errorMessage?: string;
  };
}

export type ProviderConfigsMap = Record<string, ProviderConfig>;

export const DEFAULT_PROVIDER_CONFIGS: ProviderConfigsMap = {
  openai: {
    id: 'openai',
    enabled: false,
    model: 'gpt-4o-mini',
  },
  anthropic: {
    id: 'anthropic',
    enabled: false,
    model: 'claude-3-5-sonnet-20241022',
  },
  gemini: {
    id: 'gemini',
    enabled: false,
    model: 'gemini-1.5-flash',
  },
  ollama: {
    id: 'ollama',
    enabled: false,
    endpoint: 'http://localhost:11434',
    model: 'llama3',
  },
  openrouter: {
    id: 'openrouter',
    enabled: false,
    model: 'anthropic/claude-3.5-sonnet',
  },
};

export class KeyVaultRepository {
  private readonly STORAGE_KEY = 'pepper_v2_byok_providers';
  private readonly ACTIVE_PROVIDER_KEY = 'pepper_v2_active_provider_id';

  async getAll(): Promise<ProviderConfigsMap> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { ...DEFAULT_PROVIDER_CONFIGS };
    }

    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const saved = result[this.STORAGE_KEY] as ProviderConfigsMap | undefined;
      return saved ? { ...DEFAULT_PROVIDER_CONFIGS, ...saved } : { ...DEFAULT_PROVIDER_CONFIGS };
    } catch (err) {
      console.error('[KeyVaultRepository] Failed to fetch provider keys:', err);
      return { ...DEFAULT_PROVIDER_CONFIGS };
    }
  }

  async get(providerId: string): Promise<ProviderConfig | undefined> {
    const all = await this.getAll();
    return all[providerId];
  }

  async save(providerId: string, config: Partial<ProviderConfig>): Promise<ProviderConfig> {
    const all = await this.getAll();
    const existing = all[providerId] || { id: providerId, enabled: false };
    const updated = { ...existing, ...config };
    all[providerId] = updated;

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: all });
    }

    return updated;
  }

  async setEnabled(providerId: string, enabled: boolean): Promise<void> {
    await this.save(providerId, { enabled });
  }

  async getActiveProviderId(): Promise<string | null> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
    try {
      const res = await chrome.storage.local.get(this.ACTIVE_PROVIDER_KEY);
      return (res[this.ACTIVE_PROVIDER_KEY] as string) || null;
    } catch {
      return null;
    }
  }

  async setActiveProviderId(providerId: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [this.ACTIVE_PROVIDER_KEY]: providerId });
    }
  }

  async remove(providerId: string): Promise<void> {
    const all = await this.getAll();
    delete all[providerId];

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: all });
    }
  }
}

export const keyVaultRepo = new KeyVaultRepository();
