import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

const backendPort = process.env.CARROT_BACKEND_PORT || '8099';

export default defineConfig({
  plugins: [tailwindcss(), svelte(), viteSingleFile()],
  resolve: {
    alias: {
      '@carrot-switch/shared': resolve(__dirname, '../shared/src')
    }
  },
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`
    }
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  base: '',
});
