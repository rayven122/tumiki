import { resolve } from "path";
import { defineProject } from "vitest/config";

import { nodeTestConfig } from "@tumiki/vitest-config/configs";

export default defineProject({
  test: {
    ...nodeTestConfig,
    name: "google-spreadsheet-mcp",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
