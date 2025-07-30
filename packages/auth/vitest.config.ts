import { resolve } from "path";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "@tumiki/vitest-config/base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ["../../tests/setup.ts"],
    },
    resolve: {
      alias: {
        "@tumiki/db": resolve(__dirname, "../db/src"),
      },
    },
  }),
);
