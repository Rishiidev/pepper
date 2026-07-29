# ⚡ PEPPER OS — The Operating System for Human Memory

<div align="center">
  <img src="assets/social-preview.svg" alt="PEPPER OS — Operating System for Human Memory" width="100%"/>
  <br/><br/>

**Leave any workspace instantly. Return as if you never left.**

[![Direct Download](https://img.shields.io/badge/📥_Direct_Download-.zip-FF3B30?style=for-the-badge&logo=github)](https://github.com/Rishiidev/pepper/archive/refs/heads/main.zip)
[![Latest Release](https://img.shields.io/badge/🚀_Release-v1.0.0-blue?style=for-the-badge)](https://github.com/Rishiidev/pepper/releases/tag/v1.0.0)
[![Stars](https://img.shields.io/github/stars/Rishiidev/pepper?style=for-the-badge&color=gold)](https://github.com/Rishiidev/pepper/stargazers)
[![License](https://img.shields.io/github/license/Rishiidev/pepper?style=for-the-badge)](LICENSE)

*Works in Chrome · Edge · Brave · Arc · Opera · Manifest V3*

</div>

---

## 😫 The Frustrations Pepper Slays

### 1. The 20-Minute Context Rebuilding Penalty
Every time a meeting starts or your focus is interrupted, you close your browser window. When you return, your momentum is destroyed. You spend 15 to 30 minutes hunting for old tabs, re-reading documentation, and trying to remember *what* you were doing and *why*.

### 2. Tab Hoarding & RAM Paralysis
You keep 50+ tabs open across 5 windows because you're terrified of losing your work. Your browser consumes 12 GB of RAM, your laptop fan screams, and finding the one tab you need takes 30 seconds of visual scanning.

### 3. Manual Tab Saver Friction
Traditional tab managers (OneTab, Toby, Session Buddy) feel like filing cabinets. They force you to type names, pick folders, and manage bookmarks manually. Nobody wants to manage tabs—we want to get work done.

---

## 💡 Why Install Pepper OS?

Pepper OS is not a tab manager. It is **The Operating System for Human Memory**.

- **Leave Instantly**: Close any window at any moment. Pepper silently records your open tabs, active focus time, domain clusters, and AI context intent.
- **Return Instantly**: Press `⌘K` or click **Reconstruct Memory**—Pepper expands its geometric portal and re-hydrates your exact workspace flow in milliseconds.
- **Save 15+ Hours a Month**: Eliminates context-switching friction and tab overload.
- **100% Local-First & BYOK**: Your keys and memory indexes stay on your machine. Connect OpenAI, Anthropic, Gemini, or local Ollama LLMs safely.

---

## 🚀 Complete Feature Guide

### 1. ⚡ Silent Context Auto-Capture
- **Zero Friction**: Automatically captures all open tabs, active window state, and attention signals when a window closes.
- **Attention Tracking**: Measures how long you spend on each tab (e.g. 15m on Stack Overflow vs 2s on Google).
- **Domain Cluster Naming**: Auto-names workspaces from domain intent (e.g. "Development & Debugging" instead of "Window 24").

### 2. 🧠 Work Memory Recall (⌘K)
- **Natural Language Search**: Search by what you remember (e.g. "that pricing research" or "Shopify checkout").
- **8-Weighted Field Scoring**: Searches names, intent, summary, project, tags, domain clusters, tab titles, and URLs.
- **Match-Reason Indicators**: Visual badges showing why a memory matched (intent, domain, summary, tag).

### 3. 💫 Context Reconstruction Portal
- **"I'm Back" Emotional Goal**: Full-screen geometric portal expansion overlay when resuming work.
- **Re-Hydration Stream**: Re-opens your exact tabs in order, placing you right back in your flow state.

### 4. 🤖 BYOK 8-Provider Intelligence Engine
- **Supported Providers**: OpenAI (GPT-4o), Anthropic (Claude 3.5), Google Gemini (1.5 Flash), OpenRouter, Ollama (Local LLM), LM Studio, Azure OpenAI, AWS Bedrock.
- **Local First**: API keys stored in local encrypted vault.

### 5. 🎨 Linear / Apple Dark Mode Design System
- **Ultra-Clean Monochrome**: Custom `#050507` background, high-contrast typography, maximum whitespace.
- **Interactive Geometric P Logo**: SVG mark with state animations (`normal`, `saving`, `restoring`, `ai`, `pinned`, `syncing`).

### 6. 🎓 Interactive 4-Step Onboarding Tour
- Step-by-step product tour introducing Work Memory, Silent Auto-Capture, ⌘K Recall, and BYOK setup.

---

## 📥 Direct Download Links

- 📥 **[Download Latest Source Code (.zip)](https://github.com/Rishiidev/pepper/archive/refs/heads/main.zip)**
- 🚀 **[View GitHub Releases (v1.0.0)](https://github.com/Rishiidev/pepper/releases/tag/v1.0.0)**

---

## 🛠️ How to Install & Use (Step-by-Step Guide)

### Step 1: Installation

#### Method A: From Release / Source (Recommended)
1. Download the **[pepper.zip](https://github.com/Rishiidev/pepper/archive/refs/heads/main.zip)** archive and extract it.
2. Open Chrome (or Edge / Brave / Arc) and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle switch in top-right corner).
4. Click **Load unpacked** and select the `.output/chrome-mv3` folder inside the repository.

#### Method B: Build from Source
```bash
git clone https://github.com/Rishiidev/pepper.git
cd pepper-v2
npm install
npm run build
```
Then load `.output/chrome-mv3` in `chrome://extensions/`.

---

### Step 2: How to Use Pepper OS

#### 1. Capturing a Memory
- **Automatic**: Simply close any browser window. Pepper silently captures the workspace in the background.
- **Manual**: Click the Pepper extension icon in your browser toolbar → click **Save Memory** (or press `⌘S`).

#### 2. Recalling & Reconstructing Context
- **Using ⌘K Search**: Press `⌘K` anywhere in the Pepper dashboard → type what you remember (e.g. "pricing research") → press `Enter`.
- **Using Reconstruct Memory**: Open the dashboard → click **Reconstruct Memory** on any card. The geometric portal expands and brings you right back to your work.

#### 3. Setting Up AI Providers (BYOK)
- Go to **Settings** in the dashboard.
- Select your provider (OpenAI, Anthropic, Gemini, OpenRouter, Ollama Local LLM).
- Paste your API key → saved in your browser's local encrypted storage.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open Work Memory Search |
| `⌘S` / `Ctrl+S` | Save Current Memory |
| `⌘⇧O` / `Ctrl+Shift+O` | Open Pepper Memory Dashboard |
| `ESC` | Close Search / Overlay |

---

## 🏛️ Logo System Architecture

```
┌───────────┐
│           │   Top Bar (24x8)
├───┬───────┤
│   │   P   │   Right Shoulder (8x8) & Center Portal Notch
├───┴───┬───┤
│   │ P │   │   Left Stem (8x12) & Inner Memory Block
└───┴───┴───┘
```

---

## 📄 License

MIT License © 2026 [Rishiidev](https://github.com/Rishiidev)

---

<div align="center">
<b>Found PEPPER OS useful? A ⭐ helps others find it.</b><br>
<a href="https://github.com/Rishiidev/pepper">⭐ Star this repo</a>
</div>
