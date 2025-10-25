import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config} */
export default [
  ...tseslint.configs.recommended,
  {
    ignores: ["out/**", "dist-electron/**", "node_modules/**", "*.config.*"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
