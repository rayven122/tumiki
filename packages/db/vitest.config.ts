import { resolve } from "path";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "@tumiki/vitest-config/base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ["../../tests/setup.ts"],
      coverage: {
        exclude: [
          ...(baseConfig.test?.coverage?.exclude ?? []),
          "build/",
          "prisma/**",
        ],
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  }),
);
