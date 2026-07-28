import { create } from 'zustand';
import { PepperSettings, DEFAULT_SETTINGS } from '../core/types/settings';
import { settingsRepo } from '../storage/repositories/settings-repo';
import { eventBus } from '../core/events/event-bus';

interface SettingsState {
  settings: PepperSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<PepperSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    const settings = await settingsRepo.get();
    set({ settings, isLoading: false });
  },

  updateSettings: async (updates: Partial<PepperSettings>) => {
    const updated = await settingsRepo.save(updates);
    set({ settings: updated });
    eventBus.emit('settings:updated', { settings: updated });
  },
}));
