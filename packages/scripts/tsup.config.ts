import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/cleanUserMcp.ts",
    "src/createUserMcpServer.ts",
    "src/migrateWaitingList.ts",
    "src/upsertAll.ts",
    "src/upsertMcpServers.ts",
    "src/upsertMcpTools.ts",
    "src/test-auth0-api.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  splitting: true,
  treeshake: true,
  outDir: "dist/src",
});
