import { resolve } from "path";
import { defineProject } from "vitest/config";

import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "oauth-token-manager",
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
      "@tumiki/db": resolve(__dirname, "../db/src"),
    },
  },
});
