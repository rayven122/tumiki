import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: false, // tscで別途生成
  sourcemap: true,
  clean: true,
  target: "node22",
  treeshake: true,
  splitting: false,
  outDir: "dist",
  // ファイル構造を保持
  bundle: false,
});
