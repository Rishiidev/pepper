import { create } from 'zustand';
import { PepperSettings, DEFAULT_SETTINGS } from '../core/types/settings';
import { settingsRepo } from '../storage/repositories/settings-repo';
import { eventBus } from '../core/events/event-bus';

interface SettingsState {
  settings: PepperSettings;
  isLoading: boolean;
  isHydrated: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<PepperSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isHydrated: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await settingsRepo.get();
      set({ settings, isLoading: false, isHydrated: true });
    } catch {
      set({ isLoading: false, isHydrated: true });
    }
  },

  updateSettings: async (updates: Partial<PepperSettings>) => {
    const updated = await settingsRepo.save(updates);
    set({ settings: updated, isHydrated: true });
    eventBus.emit('settings:updated', { settings: updated });
  },
}));
