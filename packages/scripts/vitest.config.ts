import path from "path";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "@tumiki/vitest-config/base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ["../../tests/setup.ts"],
      passWithNoTests: true,
      coverage: {
        thresholds: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  }),
);
