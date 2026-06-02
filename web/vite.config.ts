import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const formieBrowserRoot = dirname(require.resolve('@verbb/formie-browser/package.json'));

export default defineConfig({
  plugins: [tailwindcss()],
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
