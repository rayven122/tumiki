import { resolve } from "path";
import { defineConfig } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineConfig({
  test: {
    ...nodeTestConfig,
    name: "mcp-proxy",
    globals: true,
    environment: "node",
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 3,
      },
    },
    include: [
      "src/**/*.test.ts",
      "src/**/*.ee.test.ts",
      "src/**/*.pbt.test.ts",
    ],
    coverage: {
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
      exclude: [
        // ビルド成果物・設定ファイル
        "dist/**",
        "test/**",
        "**/*.d.ts",
        "eslint.config.js",
        "vitest.config.ts",
        // 型定義のみのファイル
        "**/src/domain/types/**",
        "**/src/shared/types/**",
        // re-export のみのバレルファイル
        "**/src/domain/**/index.ts",
        "**/src/shared/**/index.ts",
        "**/src/infrastructure/**/index.ts",
        "**/src/features/**/index.ts",
        // EE エントリーポイント
        "**/index.ee.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
      "@tumiki/db": resolve(__dirname, "../../packages/db/src"),
      "@domain": resolve(__dirname, "./src/domain"),
      "@infrastructure": resolve(__dirname, "./src/infrastructure"),
      "@shared": resolve(__dirname, "./src/shared"),
      "@features": resolve(__dirname, "./src/features"),
    },
  },
});
