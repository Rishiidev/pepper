import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { AppTheme } from '../../core/types/settings';
import { Segmented } from '../ui/Segmented';

export const ThemeToggle: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  return (
    <Segmented<AppTheme>
      label="Color theme"
      value={settings.theme}
      onChange={(theme) => void updateSettings({ theme })}
      options={[
        { value: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" aria-hidden="true" /> },
        { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" aria-hidden="true" /> },
        { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" aria-hidden="true" /> },
      ]}
    />
  );
};
