import type { NextConfig } from "next";
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import path from 'node:path';

const require = createRequire(import.meta.url);
const formieBrowserRoot = dirname(require.resolve('@verbb/formie-browser/package.json'));
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const output = process.env.NEXT_OUTPUT === 'export' ? 'export' : undefined;

const nextConfig: NextConfig = {
  output,
  basePath,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '#theme': path.join(formieBrowserRoot, 'dist/css/theme'),
      '#theme-base': path.join(formieBrowserRoot, 'dist/css/theme-base'),
    };

    return config;
  },
};

export default nextConfig;
