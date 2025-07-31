import tseslint from "typescript-eslint";

import baseConfig from "@tumiki/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**"],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./tsconfig.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
