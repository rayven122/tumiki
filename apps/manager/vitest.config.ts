import path from "path";
import { defineConfig, mergeConfig } from "vitest/config";
import reactConfig from "@tumiki/vitest-config/react";

export default mergeConfig(
  reactConfig,
  defineConfig({
    test: {
      setupFiles: ["./src/tests/setup.tsx"],
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
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
);
