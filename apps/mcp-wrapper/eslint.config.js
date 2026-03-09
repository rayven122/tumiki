import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

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
          // Feature スライス間の相互依存禁止
          {
            target: "./src/features/mcp/**",
            from: ["./src/features/health/**", "./src/features/status/**"],
            message:
              "Feature スライス間の直接インポートは禁止です。shared/ を経由してください。",
          },
          {
            target: "./src/features/health/**",
            from: ["./src/features/mcp/**", "./src/features/status/**"],
            message:
              "Feature スライス間の直接インポートは禁止です。shared/ を経由してください。",
          },
          {
            target: "./src/features/status/**",
            from: ["./src/features/mcp/**", "./src/features/health/**"],
            message:
              "Feature スライス間の直接インポートは禁止です。shared/ を経由してください。",
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
  architectureBoundaryConfig,
  domainPurityConfig,
  cqrsDbRestrictionConfig,
];
