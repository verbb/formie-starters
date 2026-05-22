import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: ['@verbb/formie-core', '@verbb/formie-browser', '@verbb/formie-web-components'],
  },
  server: {
    port: 5176,
    strictPort: true,
  },
  preview: {
    port: 4276,
    strictPort: true,
  },
});
