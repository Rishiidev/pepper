export interface IntelligenceFeatureFlags {
  aiEnabled: boolean;
  semanticSearch: boolean;
  embeddings: boolean;
  experimentalProviders: boolean;
  localModels: boolean;
  autoSummarize: boolean;
  autoTagging: boolean;
}

export const DEFAULT_INTELLIGENCE_FLAGS: IntelligenceFeatureFlags = {
  aiEnabled: false,
  semanticSearch: false,
  embeddings: false,
  experimentalProviders: false,
  localModels: false,
  autoSummarize: true,
  autoTagging: true,
};

export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager;
  private flags: IntelligenceFeatureFlags = { ...DEFAULT_INTELLIGENCE_FLAGS };
  private readonly STORAGE_KEY = 'pepper_v2_intelligence_flags';
  private hydrationPromise: Promise<IntelligenceFeatureFlags> | null = null;

  private constructor() {
    this.hydrationPromise = this.hydrateFromStorage();
  }

  static getInstance(): FeatureFlagsManager {
    if (!FeatureFlagsManager.instance) {
      FeatureFlagsManager.instance = new FeatureFlagsManager();
    }
    return FeatureFlagsManager.instance;
  }

  async ensureHydrated(): Promise<IntelligenceFeatureFlags> {
    if (this.hydrationPromise) {
      await this.hydrationPromise;
    }
    return this.getFlags();
  }

  async hydrateFromStorage(): Promise<IntelligenceFeatureFlags> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const res = await chrome.storage.local.get(this.STORAGE_KEY);
        if (res[this.STORAGE_KEY]) {
          this.flags = { ...DEFAULT_INTELLIGENCE_FLAGS, ...(res[this.STORAGE_KEY] as IntelligenceFeatureFlags) };
        }
      } catch (err) {
        console.error('[FeatureFlagsManager] Storage hydration failed:', err);
      }
    }
    return { ...this.flags };
  }

  getFlags(): IntelligenceFeatureFlags {
    return { ...this.flags };
  }

  isEnabled(flag: keyof IntelligenceFeatureFlags): boolean {
    return !!this.flags[flag];
  }

  async setFlag(flag: keyof IntelligenceFeatureFlags, value: boolean): Promise<void> {
    this.flags[flag] = value;
    await this.persist();
  }

  async updateFlags(updates: Partial<IntelligenceFeatureFlags>): Promise<void> {
    this.flags = { ...this.flags, ...updates };
    await this.persist();
  }

  async reset(): Promise<void> {
    this.flags = { ...DEFAULT_INTELLIGENCE_FLAGS };
    await this.persist();
  }

  private async persist(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: this.flags });
      } catch (err) {
        console.error('[FeatureFlagsManager] Failed to persist flags:', err);
      }
    }
  }
}

export const featureFlagsManager = FeatureFlagsManager.getInstance();
