import { resolve } from "path";
import { defineConfig } from "tsup";

import { libraryTsupConfig } from "@tumiki/tsup-config/library";

export default defineConfig({
  ...libraryTsupConfig,
  entry: [
    "src/index.ts",
    "src/tcpClient.ts",
    "src/prisma.ts",
    "src/zod.ts",
    "src/server.ts",
    "src/testing/index.ts",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
    };
  },
});
