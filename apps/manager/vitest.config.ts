import path from "path";
import { defineProject } from "vitest/config";
import { browserTestConfig } from "@tumiki/vitest-config/configs";

// EEビルドの場合は.ee.test.tsも含む、CEビルドの場合は除外
const isEEBuild = process.env.EE_BUILD === "true";

export default defineProject({
  test: {
    ...browserTestConfig,
    name: "manager",
    setupFiles: ["@tumiki/vitest-config/setup", "./vitest.setup.ts"],
    include: isEEBuild
      ? ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.ee.test.ts"]
      : ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: isEEBuild ? [] : ["src/**/*.ee.test.ts"],
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
