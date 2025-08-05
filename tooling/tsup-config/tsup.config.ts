import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/base.ts", "src/node.ts", "src/library.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
});
