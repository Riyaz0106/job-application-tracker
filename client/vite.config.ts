import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load .env from the repo root (one level up) so client and server share a
  // single env file. Vite still only exposes vars prefixed with VITE_.
  envDir: '..',
  server: {
    port: 5173,
    // Foundation for later phases: proxy API calls to the Express server so the
    // browser talks to one origin in dev and we avoid CORS. Anything the client
    // fetches under /api is forwarded to the backend on port 4000.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
