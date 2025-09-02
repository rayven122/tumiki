import baseConfig from "@tumiki/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      // このMCPはスタンドアロンでも動作するため、環境変数チェックを無効化
      "turbo/no-undeclared-env-vars": "off",
      // プロジェクトガイドラインに従い、typeのみを使用
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  {
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
