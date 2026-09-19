# Changelog

All notable changes to **PEPPER OS** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
