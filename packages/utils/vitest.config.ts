import { resolve } from "path";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "utils",
    globals: true,
    environment: "node",
    setupFiles: ["../../tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
