import { resolve } from "path";
import { defineConfig } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

// EEビルドの場合は.ee.test.tsも含む、CEビルドの場合は除外
const isEEBuild = process.env.EE_BUILD === "true";

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
    include: isEEBuild
      ? ["src/**/*.test.ts", "src/**/*.ee.test.ts"]
      : ["src/**/*.test.ts"],
    exclude: isEEBuild ? [] : ["src/**/*.ee.test.ts"],
    coverage: {
      exclude: [
        // 型定義のみのファイル（実行可能コードなし）
        "**/src/types/index.ts",
        // re-export のみのファイル（ロジックなし）
        "**/src/libs/crypto/index.ts",
        "**/src/libs/auth/index.ts",
        "**/src/libs/ai/index.ts",
        "**/src/libs/toonConversion/index.ts",
        "**/src/libs/piiMasking/index.ts",
        "**/src/services/dynamicSearch/index.ee.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
      "@tumiki/db": resolve(__dirname, "../../packages/db/src"),
    },
  },
});
