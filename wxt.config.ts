import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  vite: () => ({
    plugins: [react(), tailwindcss()],
  }),
  manifest: {
    name: 'PEPPER — Workspace Platform',
    short_name: 'PEPPER',
    description: 'Save, search, manage, and restore browser workspaces. Free RAM by organizing tabs.',
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['tabs', 'storage', 'contextMenus', 'notifications', 'scripting', 'activeTab', 'unlimitedStorage', 'sessions', 'alarms', 'idle'],
    host_permissions: [
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://generativelanguage.googleapis.com/*',
      'https://openrouter.ai/*',
      'http://localhost:11434/*'
    ],
    action: {
      default_title: 'PEPPER — Work Memory Engine',
      default_popup: 'popup.html',
    },
    commands: {
      '_execute_action': {
        suggested_key: {
          default: 'Alt+Shift+P',
          mac: 'Command+Shift+P',
        },
        description: 'Open the Pepper popup',
      },
      'save-and-close-current-tab': {
        suggested_key: {
          default: 'Alt+Shift+C',
          mac: 'Command+Shift+C',
        },
        description: 'Save the current tab to Pepper and close it',
      },
      'save-session': {
        suggested_key: {
          default: 'Alt+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Save current window workspace to Pepper',
      },
      // Chrome allows only four suggested shortcuts. Cmd+Shift+O is also Chrome's
      // Bookmark Manager, so this one is left for the user to bind if wanted.
      'open-manager': {
        description: 'Open PEPPER Workspace Manager Dashboard',
      },
      'add-tab-to-workspace': {
        suggested_key: {
          default: 'Alt+Shift+A',
          mac: 'Command+Shift+A',
        },
        description: 'Add the current tab to the active workspace',
      },
      'open-side-panel': {
        description: 'Open the Pepper side panel (timer, timeline, quick add)',
      },
      'restore-last': {
        description: 'Restore most recent workspace',
      },
      'toggle-focus-timer': {
        description: 'Start or pause the Pepper focus session timer',
      },
    },
  },
});
