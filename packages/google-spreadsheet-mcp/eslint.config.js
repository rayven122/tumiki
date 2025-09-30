import baseConfig, { restrictEnvAccess } from "@tumiki/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".turbo/**", "dist/**", "src/__tests__/**"],
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
      // プロジェクトガイドラインに従ってtypeを優先
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
