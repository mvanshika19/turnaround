import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // An explicit IPv4 address: "localhost" can bind to ::1 only, which 127.0.0.1 clients miss.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // MapLibre GL is a single ~1.1 MB module that cannot be split further; it already loads
    // lazily in its own chunk. The app chunk (React, router, TanStack Query, Motion) is ~540 kB,
    // ~170 kB gzipped. Both are expected, so the warning threshold sits above them.
    chunkSizeWarningLimit: 1200,
  },
});
