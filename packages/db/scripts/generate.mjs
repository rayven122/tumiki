#!/usr/bin/env node
// `prisma generate` のクロスプラットフォームラッパ。
//
// Windows では `prisma-fabbrica` 生成器の TypeScript 変換が
// （CI windows-latest 上で）失敗するため、当該 generator を除外して実行する。
// fabbrica はテスト用 factory 生成器であり、desktop release CI のように
// テストを走らせない経路では不要。
//
// macOS / Linux では従来通り全 generator を実行する。
import { spawnSync } from "node:child_process";

// schema 内の generator: client / zod / markdown / fabbrica
// Windows のみ fabbrica を除外
const args = ["prisma", "generate"];
if (process.platform === "win32") {
  args.push(
    "--generator",
    "client",
    "--generator",
    "zod",
    "--generator",
    "markdown",
  );
}

const result = spawnSync("pnpm", ["exec", ...args], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
