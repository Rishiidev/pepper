export interface ProviderConfig {
  id: string;
  enabled: boolean;
  apiKey?: string;
  /** Keep the key in session storage only; it is gone when the browser closes */
  sessionOnly?: boolean;
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

/** Pure: splits configs into what may be written to disk and the keys that must stay in session storage. */
export function splitSessionKeys(all: ProviderConfigsMap): { persisted: ProviderConfigsMap; sessionKeys: Record<string, string> } {
  const persisted: ProviderConfigsMap = {};
  const sessionKeys: Record<string, string> = {};
  for (const [id, cfg] of Object.entries(all)) {
    if (cfg.sessionOnly && cfg.apiKey) {
      sessionKeys[id] = cfg.apiKey;
      const { apiKey: _omit, ...rest } = cfg;
      persisted[id] = rest;
    } else {
      persisted[id] = cfg;
    }
  }
  return { persisted, sessionKeys };
}

export class KeyVaultRepository {
  private readonly STORAGE_KEY = 'pepper_v2_byok_providers';
  private readonly SESSION_KEYS = 'pepper_v2_byok_session_keys';
  private readonly ACTIVE_PROVIDER_KEY = 'pepper_v2_active_provider_id';
  /** Fallback when chrome.storage.session is unavailable */
  private memoryKeys: Record<string, string> = {};

  private async readSessionKeys(): Promise<Record<string, string>> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        const res = await chrome.storage.session.get(this.SESSION_KEYS);
        return { ...(res[this.SESSION_KEYS] as Record<string, string> | undefined) };
      }
    } catch {
      // fall through to memory
    }
    return { ...this.memoryKeys };
  }

  private async writeAll(all: ProviderConfigsMap): Promise<void> {
    const { persisted, sessionKeys } = splitSessionKeys(all);
    this.memoryKeys = sessionKeys;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        await chrome.storage.session.set({ [this.SESSION_KEYS]: sessionKeys });
      }
    } catch {
      // memory copy already updated
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: persisted });
    }
  }

  async getAll(): Promise<ProviderConfigsMap> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { ...DEFAULT_PROVIDER_CONFIGS };
    }

    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const saved = result[this.STORAGE_KEY] as ProviderConfigsMap | undefined;
      const merged: ProviderConfigsMap = saved ? { ...DEFAULT_PROVIDER_CONFIGS, ...saved } : { ...DEFAULT_PROVIDER_CONFIGS };
      const sessionKeys = await this.readSessionKeys();
      for (const [id, cfg] of Object.entries(merged)) {
        if (cfg.sessionOnly && sessionKeys[id]) merged[id] = { ...cfg, apiKey: sessionKeys[id] };
      }
      return merged;
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
    await this.writeAll(all);
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
    await this.writeAll(all);
  }
}

export const keyVaultRepo = new KeyVaultRepository();
