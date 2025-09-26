import baseConfig, { restrictEnvAccess } from "@tumiki/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".turbo/**", "dist/**"],
  },
  ...baseConfig,
  ...restrictEnvAccess,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "no-console": "off",
    },
  },
];
