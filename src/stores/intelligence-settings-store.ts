import { create } from 'zustand';
import {
  providerRegistry,
  skillRegistry,
  featureFlagsManager,
  intelligenceCache,
  intelligenceLogger,
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
  toggleAI: (enabled: boolean) => Promise<void>;
  updateFlag: (flag: keyof IntelligenceFeatureFlags, value: boolean) => Promise<void>;
  clearCache: () => void;
  refreshMetrics: () => Promise<void>;
}

export const useIntelligenceSettingsStore = create<IntelligenceSettingsState>((set, get) => {
  // Listen for cross-context Chrome storage updates (Service Worker -> Manager / Popup UI)
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'local' && (changes.pepper_v2_byok_providers || changes.pepper_v2_intelligence_flags)) {
        await get().refreshMetrics();
      }
    });
  }

  // Trigger initial storage hydration
  featureFlagsManager.hydrateFromStorage().then(() => {
    providerRegistry.hydrateFromStorage().then(() => {
      get().refreshMetrics();
    });
  });

  return {
    aiEnabled: featureFlagsManager.isEnabled('aiEnabled'),
    featureFlags: featureFlagsManager.getFlags(),
    providerCount: providerRegistry.getAllProviders().length,
    activeProviderName: providerRegistry.getActiveProvider()?.name || null,
    installedSkillsCount: skillRegistry.getAllSkills().length,
    cacheSize: intelligenceCache.size(),
    logs: intelligenceLogger.getLogs(),

    toggleAI: async (enabled: boolean) => {
      await featureFlagsManager.setFlag('aiEnabled', enabled);
      set({
        aiEnabled: enabled,
        featureFlags: featureFlagsManager.getFlags(),
      });
    },

    updateFlag: async (flag: keyof IntelligenceFeatureFlags, value: boolean) => {
      await featureFlagsManager.setFlag(flag, value);
      set({ featureFlags: featureFlagsManager.getFlags() });
    },

    clearCache: () => {
      intelligenceCache.clear();
      set({ cacheSize: 0 });
    },

    refreshMetrics: async () => {
      await featureFlagsManager.hydrateFromStorage();
      await providerRegistry.hydrateFromStorage();
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
  };
});
