import { resolve } from "path";
import { defineProject } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

/**
 * 統合MCPエンドポイントE2Eテスト用Vitest設定
 *
 * ユニットテストとは分離して実行される。
 * E2Eテストはテスト用DBとモックMCPサーバーを使用する。
 */
export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "mcp-proxy-e2e",
    globals: true,
    environment: "node",
    include: ["tests/e2e/**/*.test.ts"],
    exclude: ["src/**/*.test.ts"],
    // E2Eテストはタイムアウトを長めに設定
    testTimeout: 30000,
    hookTimeout: 30000,
    // 並列実行を無効化（サーバーポートの競合を避けるため）
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
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
