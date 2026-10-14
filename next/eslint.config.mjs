import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The starter intentionally resets request/demo state when route selections change.
      // These effects mirror the framework-neutral React starter and do not form render loops.
      "react-hooks/set-state-in-effect": "off",
      // useFormieHtml returns a state object alongside a DOM ref. The compiler rule currently
      // treats the complete hook result as if every property were the ref itself.
      "react-hooks/refs": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
