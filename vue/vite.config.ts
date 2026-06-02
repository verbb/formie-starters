// @ts-nocheck — monorepo can hoist a second Vite copy; tsc then disagrees on Plugin types.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);
const formieBrowserRoot = dirname(require.resolve('@verbb/formie-browser/package.json'));

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  resolve: {
    preserveSymlinks: true,
    alias: [
      {
        find: /^#theme\/(.*)$/,
        replacement: `${formieBrowserRoot}/dist/css/theme/$1`,
      },
      {
        find: /^#theme-base\/(.*)$/,
        replacement: `${formieBrowserRoot}/dist/css/theme-base/$1`,
      },
    ],
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
