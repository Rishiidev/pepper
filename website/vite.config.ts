import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves the site under /pepper/; Vercel serves it from the domain root
  base: process.env.VERCEL ? '/' : '/pepper/',
});
