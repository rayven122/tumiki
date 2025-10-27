import { defineConfig } from "@tumiki/vitest-config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
