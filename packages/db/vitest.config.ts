import { resolve } from "path";
import { config } from "dotenv";
import { defineProject } from "vitest/config";

import { nodeTestConfig } from "@tumiki/vitest-config/configs";

// 環境変数を読み込む
config({ path: resolve(__dirname, "../../.env.test") });

export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "db",
    globals: true,
    environment: "vprisma",
    setupFiles: ["vitest-environment-vprisma/setup", "./src/testing/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
    },
  },
});
