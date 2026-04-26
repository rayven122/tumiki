import { resolve } from "path";
import { defineConfig } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineConfig({
  test: {
    ...nodeTestConfig,
    name: "desktop",
    include: ["src/**/*.test.ts"],
    // createTestDb が pnpm exec prisma db execute を呼ぶため、並行実行時に10秒を超えることがある
    hookTimeout: 30_000,
    env: {
      DESKTOP_DB_RETRY_INITIAL_MS: "0",
      DESKTOP_DB_RETRY_MAX_MS: "0",
    },
  },
  resolve: {
    alias: {
      "@prisma/desktop-client": resolve(__dirname, "prisma/generated/client"),
    },
  },
});
