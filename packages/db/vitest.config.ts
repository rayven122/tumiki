import { resolve } from "path";
import { defineProject } from "vitest/config";

import { nodeTestConfig } from "@tumiki/vitest-config/configs";

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
