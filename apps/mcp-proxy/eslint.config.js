import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";
import headers from "eslint-plugin-headers";

const tseslintConfigs = tseslint.config(
  {
    ignores: ["dist", "node_modules", "vitest.config.ts", "coverage"],
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
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
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

// アーキテクチャ境界の強制
const architectureBoundaryConfig = {
  files: [
    "src/domain/**/*.ts",
    "src/shared/**/*.ts",
    "src/infrastructure/**/*.ts",
    "src/features/**/*.ts",
  ],
  plugins: { import: importPlugin },
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          // domain/ は純粋層（外部依存なし）
          {
            target: "./src/domain/**",
            from: [
              "./src/features/**",
              "./src/infrastructure/**",
              "./src/shared/**",
            ],
            message:
              "domain/ は純粋層です。features/, infrastructure/, shared/ からのインポートは禁止です。",
          },
          // shared/ は features/ に依存しない
          {
            target: "./src/shared/**",
            from: "./src/features/**",
            message: "shared/ は features/ からインポートできません。",
          },
          // shared/ は infrastructure/ に依存しない
          {
            target: "./src/shared/**",
            from: "./src/infrastructure/**",
            message: "shared/ は infrastructure/ からインポートできません。",
          },
          // infrastructure/ は features/ に依存しない
          {
            target: "./src/infrastructure/**",
            from: "./src/features/**",
            message: "infrastructure/ は features/ からインポートできません。",
          },
          // Feature スライス間の相互依存禁止（dynamicSearch → mcp は例外として許可）
          {
            target: "./src/features/mcp/**",
            from: ["./src/features/oauth/**", "./src/features/health/**"],
            message:
              "Feature スライス間の直接インポートは禁止です。shared/ を経由してください。",
          },
          {
            target: "./src/features/oauth/**",
            from: [
              "./src/features/mcp/**",
              "./src/features/health/**",
              "./src/features/dynamicSearch/**",
            ],
            message:
              "Feature スライス間の直接インポートは禁止です。shared/ を経由してください。",
          },
          {
            target: "./src/features/health/**",
            from: [
              "./src/features/mcp/**",
              "./src/features/oauth/**",
              "./src/features/dynamicSearch/**",
            ],
            message:
              "Feature スライス間の直接インポートは禁止です。shared/ を経由してください。",
          },
          // レガシーパスからのインポート禁止
          {
            target: "./src/domain/**",
            from: [
              "./src/libs/**",
              "./src/services/**",
              "./src/middleware/**",
              "./src/routes/**",
              "./src/handlers/**",
              "./src/constants/**",
              "./src/utils/**",
            ],
            message: "レガシーパスからのインポートは禁止です。",
          },
          {
            target: "./src/shared/**",
            from: [
              "./src/libs/**",
              "./src/services/**",
              "./src/middleware/**",
              "./src/routes/**",
              "./src/handlers/**",
              "./src/constants/**",
              "./src/utils/**",
            ],
            message: "レガシーパスからのインポートは禁止です。",
          },
          {
            target: "./src/infrastructure/**",
            from: [
              "./src/libs/**",
              "./src/services/**",
              "./src/middleware/**",
              "./src/routes/**",
              "./src/handlers/**",
              "./src/constants/**",
              "./src/utils/**",
            ],
            message: "レガシーパスからのインポートは禁止です。",
          },
          {
            target: "./src/features/**",
            from: [
              "./src/libs/**",
              "./src/services/**",
              "./src/middleware/**",
              "./src/routes/**",
              "./src/handlers/**",
              "./src/constants/**",
              "./src/utils/**",
            ],
            message: "レガシーパスからのインポートは禁止です。",
          },
        ],
      },
    ],
  },
};

// domain/ は外部パッケージに依存してはならない
const domainPurityConfig = {
  files: ["src/domain/**/*.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@tumiki/db*"],
            message: "domain/ は @tumiki/db に依存できません",
          },
          {
            group: ["hono*"],
            message: "domain/ は hono に依存できません",
          },
          {
            group: ["redis*"],
            message: "domain/ は redis に依存できません",
          },
          {
            group: ["@modelcontextprotocol/*"],
            message: "domain/ は MCP SDK に依存できません",
          },
          {
            group: ["@google-cloud/*"],
            message: "domain/ は GCP に依存できません",
          },
        ],
      },
    ],
  },
};

// Command/Query ハンドラーは DB に直接アクセスしてはならない
const cqrsDbRestrictionConfig = {
  files: [
    "src/features/**/commands/**/*.ts",
    "src/features/**/queries/**/*.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@tumiki/db*"],
            message:
              "Command/Query ハンドラーは直接 DB にアクセスできません。infrastructure/db/repositories/ を使用してください",
          },
        ],
      },
    ],
  },
};

export default [
  ...tseslintConfigs,
  headerConfig,
  architectureBoundaryConfig,
  domainPurityConfig,
  cqrsDbRestrictionConfig,
];
