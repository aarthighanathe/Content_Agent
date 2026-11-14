import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// WHY fallback before defineConfig: index.html uses %VITE_APP_URL% for
// canonical/OG tags — Vite leaves the placeholder unsubstituted when the
// env var is missing. Production Vercel URL matches the prior hardcoded value.
const DEFAULT_APP_URL = 'https://content-agent-six-chi.vercel.app'
if (!process.env.VITE_APP_URL) {
  process.env.VITE_APP_URL = DEFAULT_APP_URL
}

export default defineConfig({
  envDir: '../',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@clerk/clerk-react'))          return 'clerk';
          if (id.includes('posthog-js'))                  return 'analytics';
          if (id.includes('jspdf') || id.includes('jszip')) return 'export';
          if (id.includes('@tanstack/react-query') || id.includes('zustand') || id.includes('axios')) return 'query';
          if (id.includes('react-router-dom'))            return 'react';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
    proxy: {
      // SSE stream endpoint — needs special handling to avoid buffering
      '/api/jobs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              // Tell any downstream proxy not to buffer
              res.setHeader('X-Accel-Buffering', 'no');
              res.setHeader('Cache-Control', 'no-cache, no-transform');
            }
          });
        },
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
