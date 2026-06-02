// @ts-nocheck — monorepo can hoist a second Vite copy; tsc then disagrees on Plugin types.
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
const formieBrowserRoot = dirname(require.resolve('@verbb/formie-browser/package.json'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
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
      '@verbb/formie-react',
      '@verbb/formie-core',
      '@verbb/formie-browser',
    ],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4274,
    strictPort: true,
  },
})
