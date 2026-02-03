import { resolve } from "path";
import type { UserConfig } from "vite";

export const createVitestConfig = (dirname: string): UserConfig => ({
  resolve: {
    alias: {
      "@": resolve(dirname, "./src"),
      "~": resolve(dirname, "./"),
    },
  },
});
