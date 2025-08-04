import { resolve } from "path";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "auth",
    globals: true,
    environment: "node",
    setupFiles: ["@tumiki/vitest-config/setup"],
  },
  resolve: {
    alias: {
      "@tumiki/db": resolve(__dirname, "../db/src"),
    },
  },
});
