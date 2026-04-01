import { resolve } from "path";
import { defineConfig } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineConfig({
  test: {
    ...nodeTestConfig,
    name: "desktop",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@prisma/desktop-client": resolve(__dirname, "prisma/generated/client"),
    },
  },
});
