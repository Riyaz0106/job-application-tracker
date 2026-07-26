import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load .env from the repo root (one level up) so client and server share a
  // single env file. Vite still only exposes vars prefixed with VITE_.
  envDir: '..',
  server: {
    // Bind to every network interface (equivalent to `vite --host`), not just
    // 127.0.0.1, so other devices on the same Wi-Fi can load the app by this
    // machine's LAN IP. Without it Vite only accepts loopback connections.
    host: true,
    port: 5173,
    // Fail loudly instead of silently sliding to 5174 if the port is taken —
    // otherwise the URL you opened on your phone quietly points at nothing.
    strictPort: true,
    // Same-origin API proxy: the browser only ever calls a relative /api/* URL,
    // so on a phone that resolves to http://<lan-ip>:5173/api/... . Vite receives
    // it and forwards to the target below. `localhost:4000` is resolved by the
    // Vite process ON THIS MACHINE, not by the phone — which is exactly why the
    // proxy keeps working over the LAN and no CORS setup is needed.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
