import { resolve } from "path";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "db",
    globals: true,
    environment: "node",
    setupFiles: ["@tumiki/vitest-config/setup"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
