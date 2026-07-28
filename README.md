# ⚡ PEPPER — The Linear of Browser Workspaces

<div align="center">
  <img src="assets/social-preview.svg" alt="PEPPER — The Linear of Browser Workspaces" width="100%"/>
  <br/><br/>

**Cuts browser memory usage by 90% and restores workspaces in 1 click.**

[![Stars](https://img.shields.io/github/stars/Rishiidev/pepper?style=for-the-badge&color=gold)](https://github.com/Rishiidev/pepper/stargazers)
[![CI](https://github.com/Rishiidev/pepper/actions/workflows/validate.yml/badge.svg)](https://github.com/Rishiidev/pepper/actions)
[![License](https://img.shields.io/github/license/Rishiidev/pepper?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](https://github.com/Rishiidev/pepper/releases)

*Works in Chrome Manifest V3 · Brave · Edge*

</div>

> Cuts browser memory usage by 90% and restores workspaces in 1 click. Built with WXT, React 19, TypeScript, Tailwind CSS v4, Zustand, and Dexie IndexedDB.

---

## ⚡ The Problem

Browsers get slowed down by 50+ open tabs across multiple projects, wasting 500MB+ RAM per window. Context is lost when browser windows crash or restart, and standard bookmarks are slow and disorganized.

## 🚀 The Fix

PEPPER turns any open browser window into a saved, structured workspace with 1 keystroke (`Cmd+Shift+S`). Tabs are stored locally in Dexie IndexedDB and closed cleanly, freeing up gigabytes of RAM instantly.

---

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rishiidev/pepper.git
   cd pepper
   ```
2. **Install dependencies & build:**
   ```bash
   npm install
   npm run build
   ```
3. **Load unpacked extension in Chrome:**
   - Open `chrome://extensions`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `.output/chrome-mv3` directory

---

<div align="center">
<b>90% RAM reduction &amp; 1-click workspace restoration. Star it — 2 seconds.</b><br>
<a href="https://github.com/Rishiidev/pepper">⭐ Star on GitHub</a>
</div>

---

## 🎹 Keyboard Shortcuts

- `⌘ + Shift + S`: Save active window as a workspace
- `⌘ + Shift + O`: Open PEPPER Workspace Manager
- `⌘ + Shift + R`: Restore last saved session
- `⌘ + K`: Open Command Palette inside Manager & Popup

---

## 📁 Architecture & Subsystems

```
pepper/
├── entrypoints/
│   ├── background.ts      # Manifest V3 service worker
│   ├── manager/          # Full-page Workspace Manager dashboard
│   └── popup/            # Extension popup menu
├── src/
│   ├── core/
│   │   ├── engines/      # Workspace, Session, Restore, Timeline, Search engines
│   │   ├── events/       # Typed event bus
│   │   └── types/        # TypeScript models
│   ├── storage/          # Dexie IndexedDB schemas & chrome.storage repos
│   ├── stores/           # Zustand state management
│   └── components/       # Component system (Tailwind v4)
└── assets/               # Branding & social preview SVG
```

---

## 📜 License

[MIT License](LICENSE) · Built by [Rishiidev](https://github.com/Rishiidev)

<div align="center">
<b>Found PEPPER useful? A ⭐ helps others find it.</b><br>
<a href="https://github.com/Rishiidev/pepper">⭐ Star this repo</a>
</div>
