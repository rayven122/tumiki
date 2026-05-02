import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "tenant-console",
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@db-client": resolve(__dirname, "./prisma/generated/client"),
    },
  },
});
