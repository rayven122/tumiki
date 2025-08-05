import type { Options } from "tsup";

export const baseTsupConfig: Options = {
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  splitting: true,
  treeshake: true,
};
