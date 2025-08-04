import { resolve } from "path";
import { defineProject } from "vitest/config";
import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "proxyServer",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
      "@tumiki/db": resolve(__dirname, "../../packages/db/src"),
    },
  },
});
