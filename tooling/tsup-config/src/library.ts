import type { Options } from "tsup";

import { baseTsupConfig } from "./base";

export const libraryTsupConfig: Options = {
  ...baseTsupConfig,
  format: ["cjs", "esm"],
  dts: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".js",
    };
  },
};
