import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_ORIGIN = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin in development, so auth cookies stay SameSite=Strict.
    proxy: {
      '/api': API_ORIGIN,
      '/health': API_ORIGIN,
    },
  },
  build: {
    // The import graph scripts/check-bundle-budget.mjs measures the initial-JS budget from.
    manifest: true,
    // The 3D chunk (three.js) is lazy and budgeted separately; the budget script guards the rest.
    chunkSizeWarningLimit: 1000,
    // Fonts stay files: inlined data: URIs would need `font-src data:` in the CSP.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
});
