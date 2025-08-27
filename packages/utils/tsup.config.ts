import { resolve } from "path";
import { defineConfig } from "tsup";

import { libraryTsupConfig } from "@tumiki/tsup-config/library";

export default defineConfig({
  ...libraryTsupConfig,
  entry: [
    "src/index.ts",
    "src/server/index.ts",
    "src/server/security/index.ts",
    "src/client/index.ts",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
    };
  },
});
