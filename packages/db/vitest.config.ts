import { resolve } from "path";
import type { UserConfig } from "vitest/config";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "@tumiki/vitest-config/base";

// baseConfigの型を明示的に定義
type BaseConfigWithCoverage = UserConfig & {
  test?: {
    coverage?: {
      exclude?: string[];
    };
  };
};

export default mergeConfig(
  baseConfig as BaseConfigWithCoverage,
  defineConfig({
    test: {
      setupFiles: ["../../tests/setup.ts"],
      coverage: {
        exclude: [
          ...(() => {
            const baseExclude = (baseConfig as BaseConfigWithCoverage).test
              ?.coverage?.exclude;
            return Array.isArray(baseExclude) ? baseExclude : [];
          })(),
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
