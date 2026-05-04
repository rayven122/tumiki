import { resolve } from "path";
import { defineProject } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "internal-manager",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./src"),
    },
  },
});
