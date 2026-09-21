# Pepper Website

Official website for Pepper — Work Memory Engine.

## Features

- **High-Converting Product Story**: Highlights Pepper's unique positioning as a Work Memory Engine.
- **Interactive Browser Mockup**: Renders Pepper's extension interface with real domain grouping, tab selection, and RAM calculation.
- **Comparison Matrix**: Detailed breakdown contrasting Chrome Tab Groups vs Pepper.
- **Privacy First**: Highlights local-first IndexedDB & Chrome storage architecture.
- **SEO & Accessibility Ready**: OpenGraph metadata, JSON-LD structured data, keyboard focus indicators, and semantic HTML5.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Project structure

```text
pepper-website/
├── public/
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── BrowserMockup.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── FeatureGrid.tsx
│   │   ├── RealWorkflow.tsx
│   │   ├── PrivacySection.tsx
│   │   ├── FAQ.tsx
│   │   ├── FinalCTA.tsx
│   │   └── Footer.tsx
│   ├── data/
│   │   ├── comparison.ts
│   │   └── faq.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Deployment

Live on Vercel: https://pepper-black.vercel.app

```bash
cd website && vercel deploy --prod
```

`vite.config.ts` serves the site from `/` on Vercel (it sets `VERCEL=1` during builds) and from `/pepper/` everywhere else, which is what GitHub Pages needs. It is also deployable to Netlify or Cloudflare Pages; set `base` to match where it is hosted.

```bash
npm run build
```

The compiled static output will be located in `dist/`.

## License

MIT © 2026 PEPPER — Work Memory Engine
