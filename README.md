# Pepper

**Close it. It's saved.**

Pepper saves a browser window the moment you close it, and brings every tab back in one click. Find anything with ⌘K. It works offline, stays on your device, and needs no account.

Works in Chrome, Edge, Brave and Arc (Manifest V3).

**Website:** https://pepper-black.vercel.app

## What it does

- **Auto-save.** Close a window with two or more tabs and it appears in your workspaces. If Chrome crashes or quits mid-save, Pepper rebuilds the windows it had not finished and offers them back.
- **Restore in one click.** Same tabs, same order, the tab you were on in front. Or "Reopen last closed window" from the toolbar popup.
- **Find anything (⌘K).** Searches workspace names, tab titles and sites. Forgives typos, understands "pricing last week", and works with no AI.
- **Session timeline (optional, off by default).** See when you opened Chrome and which tabs you used, scrub to any moment, and pull tabs into a workspace. Local only, skips incognito, and you can block sites.
- **Add any tab to a workspace.** A "+" menu everywhere, a right-click menu, and `Alt+Shift+A` for the active workspace. Pepper also suggests tabs that belong together.
- **Focus timer.** A Pomodoro you start from the popup or side panel. It finishes itself and shows minutes left on the toolbar badge, even with no Pepper page open.
- **Backup.** Export and import JSON. API keys are never included.
- **Light and dark**, following your system.

## Privacy

Everything stays in your browser on your device. There is no account, no server and no analytics. The optional AI feature only runs if you add your own key, and then requests go straight from your browser to the provider you pick. Keys are stored in this browser's extension storage (not synced, not encrypted at rest).

Permissions: `tabs` (read titles and addresses to save and restore), `storage` and `unlimitedStorage` (keep your data locally), `activeTab` and `scripting` (the quick-save panel), `contextMenus`, `notifications` (optional), `sessions` (reopen a closed window), `alarms` (finish the timer, timeline heartbeat), `idle` (only for the timeline), `sidePanel`.

## Install

Pepper is not on the Chrome Web Store yet.

1. Download the repository and run:
   ```bash
   npm install
   npm run build
   ```
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `.output/chrome-mv3`.

## Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Find anything |
| `⌘S` / `Ctrl+S` | Save window (in the popup) |
| `⌘⇧C` / `Alt+Shift+C` | Save the current tab and close it |
| `⌘⇧A` / `Alt+Shift+A` | Add the current tab to the active workspace |
| `⌘⇧P` / `Alt+Shift+P` | Open the popup |

Change or add shortcuts at `chrome://extensions/shortcuts`. Chrome allows four suggested shortcuts, so "Open dashboard", "Open side panel", "Restore last" and "Toggle focus timer" are unassigned by default.

## Develop

```bash
npm run dev        # extension with hot reload
npm run compile    # type check
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests in real Chromium (needs: npx playwright-core install chromium)
node e2e/design-quality.e2e.mjs   # accessibility, minimum text size, one primary action per view
node e2e/store-assets.mjs         # regenerate Chrome Web Store screenshots into store/
cd website && npm run build       # marketing site
```

Open `manager.html?view=design` in the extension for the design system page, including a live contrast table.

## Design system

Light is the reference look and dark is its own palette; both follow the system. Color has one job each: ink for the hero, mint for focus and time, lilac for the timeline, butter for things that need attention. Red is reserved for the single primary action on a view. Type is Plus Jakarta Sans, bundled locally, with 12px as the smallest size.

## License

MIT. See [LICENSE](LICENSE).
