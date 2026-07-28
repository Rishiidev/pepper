# Contributing to PEPPER

Thank you for your interest in contributing to PEPPER!

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Rishiidev/pepper.git
   cd pepper
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev mode (with Live Extension HMR):
   ```bash
   npm run dev
   ```
4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `.output/chrome-mv3` folder inside `pepper`

## Code Structure

- `entrypoints/`: Background service worker (`background.ts`), Popup (`popup/`), and Manager Dashboard (`manager/`).
- `src/core/engines/`: Workspace discovery, Dexie session storage, restoration, timeline grouping, search.
- `src/stores/`: Zustand reactive state management.
- `src/components/`: Reusable Tailwind UI components.

## Submitting Pull Requests

- Keep changes modular and adhere to existing engine abstractions.
- Run `npm run compile` to verify strict TypeScript types.
- Include a summary of changes and before/after screenshots in your PR description.
