import { PepperSettings, DEFAULT_SETTINGS } from '../../core/types/settings';

const SETTINGS_STORAGE_KEY = 'pepper_v2_settings';

export class SettingsRepository {
  async get(): Promise<PepperSettings> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
        return { ...DEFAULT_SETTINGS, ...data[SETTINGS_STORAGE_KEY] };
      } catch {
        // Fallback to localStorage if chrome.storage fails
      }
    }

    const local = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    return local ? { ...DEFAULT_SETTINGS, ...JSON.parse(local) } : DEFAULT_SETTINGS;
  }

  async save(settings: Partial<PepperSettings>): Promise<PepperSettings> {
    const current = await this.get();
    const updated = { ...current, ...settings };

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    }

    return updated;
  }
}

export const settingsRepo = new SettingsRepository();
