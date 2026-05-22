// @ts-nocheck — monorepo can hoist a second Vite copy; tsc then disagrees on Plugin types.
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  resolve: {
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: [
      '@verbb/formie-vue',
      '@verbb/formie-core',
      '@verbb/formie-browser',
    ],
  },
  server: {
    port: 5175,
    strictPort: true,
  },
  preview: {
    port: 4275,
    strictPort: true,
  },
});
