import { resolve } from "path";
import { defineProject } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

// EEビルドの場合は.ee.test.tsも含む、CEビルドの場合は除外
const isEEBuild = process.env.EE_BUILD === "true";

export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "mcp-proxy",
    globals: true,
    environment: "node",
    include: isEEBuild
      ? ["src/**/*.test.ts", "src/**/*.ee.test.ts"]
      : ["src/**/*.test.ts"],
    exclude: isEEBuild ? [] : ["src/**/*.ee.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
      "@tumiki/db": resolve(__dirname, "../../packages/db/src"),
    },
  },
});
