import baseConfig from '../../plugin-kit-repo/plugin-kit/dist/eslint/config.base.js';
import reactHooksConfig from '../../plugin-kit-repo/plugin-kit/dist/eslint/config.react-hooks.js';
import typescriptConfig from '../../plugin-kit-repo/plugin-kit/dist/eslint/config.typescript-only.js';
import reactRefresh from 'eslint-plugin-react-refresh';

import { defineConfig } from 'eslint/config';

export default defineConfig([
    ...baseConfig,
    ...typescriptConfig,
    ...reactHooksConfig,
    reactRefresh.configs.vite,
]);
