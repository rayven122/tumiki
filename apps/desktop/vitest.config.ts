import { resolve } from "path";
import { defineConfig } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

const hookTimeout = Number(process.env.VITEST_HOOK_TIMEOUT_MS ?? 30_000);

export default defineConfig({
  test: {
    ...nodeTestConfig,
    name: "desktop",
    include: ["src/**/*.test.ts"],
    // createTestDb が pnpm exec prisma db execute を呼ぶため、並行実行時に10秒を超えることがある
    hookTimeout,
    env: {
      DESKTOP_DB_RETRY_INITIAL_MS: "0",
      DESKTOP_DB_RETRY_MAX_MS: "0",
    },
  },
  resolve: {
    alias: {
      "@prisma/desktop-client": resolve(__dirname, "prisma/generated/client"),
      // React を 1 インスタンスに統一し、複数バージョン共存による hooks エラーを防ぐ
      react: resolve(__dirname, "node_modules/react"),
      "react-dom": resolve(__dirname, "node_modules/react-dom"),
    },
  },
});
