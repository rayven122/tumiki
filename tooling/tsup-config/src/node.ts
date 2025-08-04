import type { Options } from "tsup";

import { baseTsupConfig } from "./base";

export const nodeTsupConfig: Options = {
  ...baseTsupConfig,
  format: ["esm"],
  shims: true,
  bundle: true,
};
