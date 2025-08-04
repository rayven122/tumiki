import path from "path";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "scripts",
    globals: true,
    environment: "node",
    setupFiles: ["../../tests/setup.ts"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
