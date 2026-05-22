// @ts-nocheck — monorepo can hoist a second Vite copy; tsc then disagrees on Plugin types.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    preserveSymlinks: true,
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
