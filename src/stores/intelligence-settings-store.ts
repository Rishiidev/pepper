import { create } from 'zustand';
import {
  providerRegistry,
  skillRegistry,
  featureFlagsManager,
  intelligenceCache,
  intelligenceLogger,
  MockProvider,
  IntelligenceFeatureFlags,
  LogEntry,
} from '../core/intelligence';

interface IntelligenceSettingsState {
  aiEnabled: boolean;
  featureFlags: IntelligenceFeatureFlags;
  providerCount: number;
  activeProviderName: string | null;
  installedSkillsCount: number;
  cacheSize: number;
  logs: LogEntry[];

  // Actions
  toggleAI: (enabled: boolean) => void;
  updateFlag: (flag: keyof IntelligenceFeatureFlags, value: boolean) => void;
  clearCache: () => void;
  refreshMetrics: () => void;
}

// Auto-register MockProvider on store initialization so the framework is instantly testable offline
providerRegistry.register(new MockProvider());

export const useIntelligenceSettingsStore = create<IntelligenceSettingsState>((set) => ({
  aiEnabled: featureFlagsManager.isEnabled('aiEnabled'),
  featureFlags: featureFlagsManager.getFlags(),
  providerCount: providerRegistry.getAllProviders().length,
  activeProviderName: providerRegistry.getActiveProvider()?.name || null,
  installedSkillsCount: skillRegistry.getAllSkills().length,
  cacheSize: intelligenceCache.size(),
  logs: intelligenceLogger.getLogs(),

  toggleAI: (enabled: boolean) => {
    featureFlagsManager.setFlag('aiEnabled', enabled);
    set({
      aiEnabled: enabled,
      featureFlags: featureFlagsManager.getFlags(),
    });
  },

  updateFlag: (flag: keyof IntelligenceFeatureFlags, value: boolean) => {
    featureFlagsManager.setFlag(flag, value);
    set({ featureFlags: featureFlagsManager.getFlags() });
  },

  clearCache: () => {
    intelligenceCache.clear();
    set({ cacheSize: 0 });
  },

  refreshMetrics: () => {
    set({
      aiEnabled: featureFlagsManager.isEnabled('aiEnabled'),
      featureFlags: featureFlagsManager.getFlags(),
      providerCount: providerRegistry.getAllProviders().length,
      activeProviderName: providerRegistry.getActiveProvider()?.name || null,
      installedSkillsCount: skillRegistry.getAllSkills().length,
      cacheSize: intelligenceCache.size(),
      logs: intelligenceLogger.getLogs(),
    });
  },
}));
