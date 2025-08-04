import { resolve } from "path";
import type { UserConfig } from "vitest/config";

export const createVitestConfig = (dirname: string): UserConfig => ({
  resolve: {
    alias: {
      "@": resolve(dirname, "./src"),
      "~": resolve(dirname, "./"),
    },
  },
});
