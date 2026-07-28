# Changelog

All notable changes to PEPPER documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [1.0.0] — 2026-07-29

### Added
- Modular Manifest V3 Browser Extension platform powered by WXT, React 19, TypeScript, and Tailwind v4.
- `WorkspaceEngine`: Multi-window tab discovery, system URL filter, safe fallback window resolver, and resilient tab closure.
- `SessionEngine`: Fast IndexedDB persistence using Dexie, badge counters, and RAM metrics estimation.
- `RestoreEngine`: 1-click workspace restoration into dedicated, focused Chrome windows.
- `TimelineEngine`: Date-based timeline grouping (`Pinned`, `Today`, `Yesterday`, `This Week`, `Older`).
- `SearchEngine`: High-performance fuzzy search across workspace names, tab titles, and URLs.
- Cross-Context Synchronization: Automatic reactive state updates across Service Worker, Manager Dashboard, and Extension Popup via `chrome.storage.onChanged`.
- Command Palette (`⌘K`): Keyboard-driven workspace command modal.
