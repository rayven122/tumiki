import { resolve } from "path";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "proxyServer",
    globals: true,
    environment: "node",
    setupFiles: ["../../tests/setup.ts"],
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
      "@tumiki/db": resolve(__dirname, "../../packages/db/src"),
    },
  },
});
