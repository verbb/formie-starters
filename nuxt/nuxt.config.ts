import path from 'node:path'
import { createRequire } from 'node:module'

// https://nuxt.com/docs/api/configuration/nuxt-config
const isDev = process.env.NODE_ENV === 'development'
const defaultFormieBaseUrl = 'https://craft.ddev.site'
const appBaseURL = process.env.NUXT_APP_BASE_URL || '/'
const appBasePath = appBaseURL.endsWith('/') ? appBaseURL : `${appBaseURL}/`
const require = createRequire(import.meta.url)
const formieBrowserRoot = path.dirname(require.resolve('@verbb/formie-browser/package.json'))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  build: {
    transpile: ['@verbb/formie-core'],
  },
  app: {
    baseURL: appBaseURL,
    head: {
      title: 'Formie Nuxt Starter',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: `${appBasePath}favicon.ico` },
        ...(isDev
          ? [
              { rel: 'stylesheet', href: '/_nuxt/assets/css/layers.css?direct' },
              { rel: 'stylesheet', href: '/_nuxt/assets/css/formie.css?direct' },
              { rel: 'stylesheet', href: '/_nuxt/assets/css/formie-bridge.css?direct' },
            ]
          : []),
      ],
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  tailwindcss: {
    cssPath: false,
  },
  nitro: {
    prerender: {
      routes: [
        '/',
        '/server-rendered/rest',
        '/server-rendered/graphql',
        '/client-rendered/rest',
        '/client-rendered/graphql',
      ],
    },
  },
  css: isDev
    ? []
    : [
        './app/assets/css/layers.css',
        './app/assets/css/formie.css',
        './app/assets/css/formie-bridge.css',
      ],
  vite: {
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
    server: {
      fs: {
        allow: [
          path.resolve(__dirname),
          path.resolve(__dirname, '../../plugin'),
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
