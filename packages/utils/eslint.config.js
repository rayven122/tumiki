import baseConfig from "@tumiki/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**", "tsup.config.ts"],
  },
  ...baseConfig,
];
