import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { AppTheme } from '../../core/types/settings';

const OPTIONS: Array<{ value: AppTheme; label: string; icon: React.ReactNode }> = [
  { value: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" aria-hidden="true" /> },
  { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" aria-hidden="true" /> },
];

export const ThemeToggle: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : OPTIONS.length - 1)) % OPTIONS.length;
    void updateSettings({ theme: OPTIONS[next].value });
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Color theme" className="inline-flex rounded-xl border border-border bg-surface-card p-0.5">
      {OPTIONS.map((o, i) => {
        const selected = settings.theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => updateSettings({ theme: o.value })}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selected ? 'bg-pepper-500 text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
};
