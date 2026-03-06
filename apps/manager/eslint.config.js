import tseslint from "typescript-eslint";
import headers from "eslint-plugin-headers";

const tseslintConfigs = tseslint.config(
  {
    ignores: [
      ".next",
      "next-env.d.ts", // Next.js auto-generated file
      "prisma/**",
      "src/app/(chat)/**", // For ai-chatbot
      "src/artifacts/**", // For ai-chatbot
      "src/components/*.tsx", // For ai-chatbot
      "src/hooks/**", // For ai-chatbot
      "src/lib/ai/**", // For ai-chatbot
      "src/lib/constants.ts", // For ai-chatbot
      "src/lib/editor/suggestions.tsx", // For ai-chatbot
      "vitest.config.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);

// EEファイル用のヘッダールール設定（tseslint.configの外で定義）
const headerConfig = {
  files: ["**/*.ee.ts", "**/*.ee.test.ts"],
  plugins: { headers },
  rules: {
    "headers/header-format": [
      "error",
      {
        source: "string",
        style: "line",
        content: `SPDX-License-Identifier: Elastic-2.0
Copyright (c) 2024-2025 Reyven Inc.`,
      },
    ],
  },
};

export default [...tseslintConfigs, headerConfig];
