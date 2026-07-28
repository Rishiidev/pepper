import { PepperSettings, DEFAULT_SETTINGS } from '../../core/types/settings';

const SETTINGS_STORAGE_KEY = 'pepper_v2_settings';

export class SettingsRepository {
  async get(): Promise<PepperSettings> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
        return { ...DEFAULT_SETTINGS, ...data[SETTINGS_STORAGE_KEY] };
      }
    } catch {
      // Fallback for non-extension environments (e.g. tests)
    }

    const local = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return local ? { ...DEFAULT_SETTINGS, ...JSON.parse(local) } : DEFAULT_SETTINGS;
  }

  async save(settings: Partial<PepperSettings>): Promise<PepperSettings> {
    const current = await this.get();
    const updated = { ...current, ...settings };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated });
      }
    } catch {
      // Fallback
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}

export const settingsRepo = new SettingsRepository();
