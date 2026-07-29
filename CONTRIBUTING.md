# Contributing to PEPPER OS

Thank you for helping build the future operating system for human memory!

## How to Contribute

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/Rishiidev/pepper.git
   cd pepper-v2
   npm install
   ```

2. **Development**:
   ```bash
   npm run dev      # WXT local dev server with auto-reload
   npm run compile  # Type check with tsc --noEmit
   npm run build    # Build production MV3 extension bundle
   ```

3. **Submitting a Pull Request**:
   - Keep changes focused and well-tested.
   - Run `npm run compile` and `npm run build` before committing.
   - Include before/after output or screenshots in your PR description.

## Code Guidelines

- **Brand Language**: Never call them "sessions", "bookmarks", or "saved tabs". User-facing entity is **Memory**.
- **Aesthetics**: Follow the Linear/Apple monochrome dark mode (`#050507`). Whitespace over borders.
- **Local First**: Never send user memory data or browser telemetry to un-configured external servers.
