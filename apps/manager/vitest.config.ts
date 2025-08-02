import path from "path";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "manager",
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.tsx"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
