import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/emails/index.ts", "src/templates/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  splitting: true,
  treeshake: true,
  outDir: "dist/src",
});
