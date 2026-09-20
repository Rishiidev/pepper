import { AppTheme } from '../types/settings';

const RESOLVED_KEY = 'pepper_theme_resolved';
const SETTINGS_KEY = 'pepper_v2_settings';

export type ResolvedTheme = 'dark' | 'light';

export function resolveTheme(theme: AppTheme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme: AppTheme): void {
  const resolved = resolveTheme(theme, prefersDark());
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  try {
    localStorage.setItem(RESOLVED_KEY, resolved);
  } catch {
    // storage blocked
  }
}

/**
 * Applies the saved theme before first paint (using the last resolved value from
 * localStorage) then keeps it in sync with settings changes and the OS preference.
 */
export function initTheme(): void {
  try {
    const cached = localStorage.getItem(RESOLVED_KEY);
    if (cached === 'light' || cached === 'dark') {
      document.documentElement.dataset.theme = cached;
      document.documentElement.classList.toggle('dark', cached === 'dark');
    }
  } catch {
    // storage blocked
  }

  let current: AppTheme = 'system';
  const sync = (t?: AppTheme) => {
    if (t) current = t;
    applyTheme(current);
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(SETTINGS_KEY).then((res) => {
      sync((res[SETTINGS_KEY]?.theme as AppTheme | undefined) ?? 'system');
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      const next = changes[SETTINGS_KEY]?.newValue?.theme as AppTheme | undefined;
      if (area === 'local' && next) sync(next);
    });
  } else {
    sync('system');
  }

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => sync());
}
