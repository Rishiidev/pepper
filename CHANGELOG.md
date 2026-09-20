# Changelog

All notable changes to **PEPPER OS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased — redesign]

### Added
- **Tasks**: a local to-do list with no account. Add from the popup or side panel, from any tab's "+" menu ("Add as a task"), from a workspace card, or by right-clicking a page ("Add this tab as a task"). With an active workspace, the popup and side panel show just that workspace's tasks.
- **Focus on a task**: pick a task before starting a session (or press play on it). When the session ends, Pepper asks whether to mark the task done. Workspace cards show their open task count. Tasks are included in backups. Tasks appear only in Pepper's own pages: nothing is injected into sites you browse and there are no task notifications.

### Changed
- **New design system**: a soft light/dark palette that follows your system, mint/lilac/butter zones with one red primary action per view, Plus Jakarta Sans bundled locally (no Google Fonts), rounded bento cards, 12px minimum text.
- **Popup**: one ink card to save the window in a click (⌘S), Undo, inline rename; reopen-last and focus timer below.
- **Dashboard**: five sections (Home, Workspaces, Timeline, Focus, Settings). Home leads with "Continue where you left off". History and Insights now live inside Timeline.
- **Timeline**: a real hour axis with session bands, scrubber, and a log grouped by hour.
- **Onboarding**: opens with a live demo ("Close it. It's saved."), then two optional choices. It no longer saves or closes your real tabs.
- **Plain language**: "Memory OS", "Reconstruct Memory" and similar are gone. Invented scores and the "85% more momentum" claim are removed.
- Deleting a workspace uses an Undo toast instead of a confirm dialog.
- AI settings list only the five providers that exist and hide advanced options behind a disclosure.
- Marketing site rebuilt to match, with real screenshots and a plain-language permissions list.

### Added
- Toasts with Undo, a design-system page (`?view=design`) with a live WCAG contrast table, local-only "Get started" checklist, one-time review prompt after the third restore.
- Design-quality end-to-end gates (axe, 12px minimum, one primary action, no horizontal scroll) in both themes, and Chrome Web Store screenshot generator.

### Fixed
- Tabs that were still loading when a window closed were left out of the auto-save.
- The focus **Start** button and its length picker no longer crop or crowd the card in the side panel (down to 280px wide), and the dashboard nav, header and segmented controls wrap instead of overflowing on phone widths. New crop and overlap gates in the design e2e cover the popup, side panel and every dashboard view.
- Sidebar navigation labels line up on desktop; Home's first-run cards no longer wrap headings or misalign buttons.
- The contribution grid and daily journal grouped activity by UTC day, so outside UTC today's work landed on the wrong cell. They now use your local day.
- When a focus countdown ended with several Pepper pages open, each one (plus the background alarm) finished the session, repeating the AI summary and events. The first one to finish now claims it.
- The open-dashboard shortcut opened a second dashboard tab when the first had a `?view=` address, and opening an existing dashboard reloaded it and lost the current view.
- Dashboard data no longer loads twice per change, and a slow older load can no longer overwrite a newer one.

## [Unreleased — session timeline]

### Added
- **Browser session timeline** (opt-in, local only): a session starts when Chrome opens and ends when the last window closes. Pepper logs each tab opened, navigated to, switched to and closed, plus real active time (paused while Chrome is unfocused or you are away). Incognito is never recorded and a domain blocklist keeps sites out entirely. A session that ends without a clean close is marked **Interrupted**.
- **Timeline view**: day picker, recap ("You focused 3h 10m, mostly on Stripe docs and Linear"), a scrubber to see what was open at any moment, "Reopen this moment", "Save as workspace", and a "+" on every entry.
- **Add any tab to a workspace**: "+" menu in the popup, side panel and timeline; right-click "Add this tab to workspace" with recent workspaces; **Alt+Shift+A** adds the current tab to the *active* workspace (star a workspace to make it active). Duplicates are skipped.
- **Suggestions**: the side panel offers "Add 3 open tabs to <workspace>?" or "Group 3 tabs about <topic>?".
- **Side panel**: timer, active workspace, open tabs, suggestions and today's timeline beside your tabs.
- **Pomodoro everywhere**: one-click "Start 25:00" in the popup and side panel; the timer finishes and updates the toolbar badge (minutes left) through alarms even when no Pepper page is open. Focus time appears on the workspace it was attached to.
- Idle detection, Vitest tests for the recorder/replay/recap/suggestions, and repo-level Playwright e2e tests (`npm run test:e2e`).

### Changed
- Shortcut slots: Chrome allows four suggested shortcuts, so `Cmd/Alt+Shift+O` (open dashboard, also Chrome's Bookmark Manager on Mac) is now unbound by default; `Alt+Shift+A` adds a tab.

### Fixed
- The `toggle-focus-timer` shortcut no longer makes the timer jump forward after resuming.

## [Unreleased]

### Added
- **Auto-capture feedback**: green `+N` badge flash, a silent notification with Reopen / Rename, and a dashboard toast ("Saved 6 tabs") with the name editable in place.
- **Reopen last closed window** in the popup (Chrome's own session history first, Pepper's snapshot as fallback).
- **Crash recovery**: window state is written continuously to durable storage; windows that were never finalized when Chrome quit or the worker was killed are saved on next startup and offered in a "Restore your last session" banner.
- **Export / import backup** (JSON, validated; API keys are never exported) and **retention** for auto-captures (age and count limits, pinned/favorites always kept). Adds `unlimitedStorage` and `sessions` permissions.
- **Offline search** with typo tolerance, word forms, related words, abbreviations and time phrases ("pricing last week"). ⌘K needs no AI setup.
- **Smarter names**: topic from page titles plus intent from a ~150-domain map, e.g. "Stripe Webhooks · Development".
- **Live onboarding demo**: open 3 tabs, close the window, restore it.
- **Light / dark / system theme**, visible keyboard focus rings, ARIA labels and roles, reduced-motion support.
- Vitest unit tests (`npm test`).

### Changed
- Onboarding no longer saves and closes your real tabs when you finish.
- Window snapshots are size-capped (4 MB) so windows with hundreds of tabs cannot overflow storage.

## [1.0.0] — 2026-07-29

### Added
- **PEPPER OS Brand & Geometric P Logo System**: Interactive SVG mark with state animations (`normal`, `saving`, `restoring`, `ai`, `pinned`, `syncing`).
- **Silent Context Auto-Capture**: Background service worker silently records open tabs, active focus time, and domain clusters on browser window close.
- **Work Memory Recall (⌘K)**: Ranked full-text search across 8 weighted fields with match-reason indicators and recency boosting.
- **Memory Reconstruction Overlay**: Portal expansion animation and emotional re-hydration flow ("I'm Back.").
- **Linear/Apple Dark Mode Design System**: Ultra-clean `#050507` monochrome palette, high-contrast typography, and keyframe motion.
- **BYOK Intelligence Engine**: Support for OpenAI, Anthropic, Gemini, OpenRouter, and Ollama.
- **Interactive 4-Step Onboarding**: Step-by-step product tour introducing Work Memory, Silent Auto-Capture, ⌘K Recall, and BYOK.
