import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(svelte|@sveltejs\/kit|@tanstack\/svelte-query)/.test(id)) {
            return 'vendor';
          }
          if (/node_modules\/(bits-ui|vaul-svelte|svelte-sonner|sveltekit-superforms)/.test(id)) {
            return 'ui';
          }
        },
      },
    },
  },
  ssr: {
    noExternal: ['@lucide/svelte'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});