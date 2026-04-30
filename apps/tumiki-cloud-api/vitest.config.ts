import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "tumiki-cloud-api",
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
