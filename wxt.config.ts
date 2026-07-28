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
    permissions: ['tabs', 'storage', 'contextMenus'],
    commands: {
      'save-session': {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Save current window workspace',
      },
      'open-manager': {
        suggested_key: {
          default: 'Ctrl+Shift+O',
          mac: 'Command+Shift+O',
        },
        description: 'Open Workspace Manager Dashboard',
      },
      'restore-last': {
        suggested_key: {
          default: 'Ctrl+Shift+R',
          mac: 'Command+Shift+R',
        },
        description: 'Restore most recent workspace',
      },
    },
  },
});
