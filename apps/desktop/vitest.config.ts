import { resolve } from "path";
import { defineConfig } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineConfig({
  test: {
    ...nodeTestConfig,
    name: "desktop",
    include: ["src/**/*.test.ts"],
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
