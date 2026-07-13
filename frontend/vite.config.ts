import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const backendPort = process.env.CARROT_BACKEND_PORT || '8099';

export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`
    }
  },
  build: {
    outDir: '../src/carrot_switch/web/static',
    emptyOutDir: true
  }
});
