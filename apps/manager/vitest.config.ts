import path from "path";
import { defineProject } from "vitest/config";
import { browserTestConfig } from "@tumiki/vitest-config/configs";

export default defineProject({
  test: {
    ...browserTestConfig,
    name: "manager",
    setupFiles: ["./src/tests/setup.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./"),
    },
  },
});
