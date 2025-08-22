import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/base.ts", "src/node.ts", "src/library.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  splitting: false, // コード分割を無効化
});
