import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: { build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } } },
  preload: { build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') } } } },
  renderer: {
    root: resolve('src/renderer'),
    base: './', // file:// in the packaged app
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    build: {
      assetsInlineLimit: 0, // never inline fonts as data: URIs; the CSP only allows font-src 'self'
      rollupOptions: { input: { index: resolve('src/renderer/index.html') } },
    },
  },
});
