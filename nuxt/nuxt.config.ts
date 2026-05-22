import path from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
const isDev = process.env.NODE_ENV === 'development'
const defaultFormieBaseUrl = 'https://craft.ddev.site:8443'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  build: {
    transpile: ['@verbb/formie-core'],
  },
  app: {
    head: {
      link: isDev
        ? [
            { rel: 'stylesheet', href: '/_nuxt/assets/css/layers.css?direct' },
            { rel: 'stylesheet', href: '/_nuxt/assets/css/formie.css?direct' },
            { rel: 'stylesheet', href: '/_nuxt/assets/css/formie-bridge.css?direct' },
          ]
        : [],
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  tailwindcss: {
    cssPath: false,
  },
  css: isDev
    ? []
    : [
        './app/assets/css/layers.css',
        './app/assets/css/formie.css',
        './app/assets/css/formie-bridge.css',
      ],
  vite: {
    server: {
      fs: {
        allow: [
          path.resolve(__dirname),
          path.resolve(__dirname, '../../formie-plugin-repo'),
        ],
      },
    },
    optimizeDeps: {
      exclude: ['@verbb/formie-core', '@verbb/formie-browser', '@verbb/formie-vue'],
    },
  },
  runtimeConfig: {
    public: {
      formieBaseUrl: process.env.NUXT_PUBLIC_FORMIE_BASE_URL?.trim() || defaultFormieBaseUrl,
      formieGraphqlEndpoint: process.env.NUXT_PUBLIC_FORMIE_GRAPHQL_ENDPOINT || '',
      formieSinglePageHandle: process.env.NUXT_PUBLIC_FORMIE_SINGLE_PAGE_HANDLE || 'singlePage',
      formieMultiPageHandle: process.env.NUXT_PUBLIC_FORMIE_MULTI_PAGE_HANDLE || 'multiPage',
      formieAdvancedHandle: process.env.NUXT_PUBLIC_FORMIE_ADVANCED_HANDLE || 'advanced',
    },
  },
})
