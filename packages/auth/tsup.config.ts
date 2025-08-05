import { resolve } from "path";
import { defineConfig } from "tsup";

import { nodeTsupConfig } from "@tumiki/tsup-config/node";

export default defineConfig({
  ...nodeTsupConfig,
  entry: ["src/index.ts", "src/client.ts", "src/server.ts"],
  outDir: "dist/src",
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
    };
  },
});
