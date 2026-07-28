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
  aiEnabled: false, // Default off until user enables or configures provider
  semanticSearch: false,
  embeddings: false,
  experimentalProviders: false,
  localModels: false,
  autoSummarize: false,
  autoTagging: false,
};

export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager;
  private flags: IntelligenceFeatureFlags = { ...DEFAULT_INTELLIGENCE_FLAGS };

  private constructor() {}

  static getInstance(): FeatureFlagsManager {
    if (!FeatureFlagsManager.instance) {
      FeatureFlagsManager.instance = new FeatureFlagsManager();
    }
    return FeatureFlagsManager.instance;
  }

  getFlags(): IntelligenceFeatureFlags {
    return { ...this.flags };
  }

  isEnabled(flag: keyof IntelligenceFeatureFlags): boolean {
    return !!this.flags[flag];
  }

  setFlag(flag: keyof IntelligenceFeatureFlags, value: boolean): void {
    this.flags[flag] = value;
  }

  updateFlags(updates: Partial<IntelligenceFeatureFlags>): void {
    this.flags = { ...this.flags, ...updates };
  }

  reset(): void {
    this.flags = { ...DEFAULT_INTELLIGENCE_FLAGS };
  }
}

export const featureFlagsManager = FeatureFlagsManager.getInstance();
