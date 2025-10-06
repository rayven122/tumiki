import { resolve } from "path";
import { defineConfig } from "tsup";

import { nodeTsupConfig } from "@tumiki/tsup-config/node";

export default defineConfig({
  ...nodeTsupConfig,
  entry: [
    "src/cleanUserMcp.ts",
    "src/createUserMcpServer.ts",
    "src/migrateWaitingList.ts",
    "src/security-scan-mcp.ts",
    "src/upsertAll.ts",
    "src/upsertMcpServers.ts",
    "src/upsertMcpTools.ts",
    "src/test-auth0-api.ts",
  ],
  outDir: "dist/src",
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
    };
  },
});
