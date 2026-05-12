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
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Windows で除外する generator 名（fabbrica の TS 変換が windows-latest CI で失敗するため）
const EXCLUDED_ON_WIN32 = new Set(["fabbrica"]);

// prisma CLI は `--exclude-generator` をサポートしないため、Windows では
// 残す generator 名を `--generator` で明示列挙する。
// schema ファイル群から generator ブロック名を動的に抽出することで、
// schema に generator を追加した際の更新漏れを防ぐ。
const collectGeneratorNames = () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaDir = path.resolve(__dirname, "..", "prisma", "schema");
  const generatorPattern = /^generator\s+(\w+)\s*\{/gm;
  const names = [];
  for (const entry of readdirSync(schemaDir)) {
    if (!entry.endsWith(".prisma")) continue;
    const content = readFileSync(path.join(schemaDir, entry), "utf8");
    for (const match of content.matchAll(generatorPattern)) {
      names.push(match[1]);
    }
  }
  return names;
};

const args = ["prisma", "generate"];
if (process.platform === "win32") {
  const allowed = collectGeneratorNames().filter(
    (name) => !EXCLUDED_ON_WIN32.has(name),
  );
  for (const name of allowed) {
    args.push("--generator", name);
  }
}

const result = spawnSync("pnpm", ["exec", ...args], {
  stdio: "inherit",
  shell: true,
});
if (result.error) {
  console.error("prisma generate 実行に失敗しました:", result.error.message);
  process.exit(1);
}
// シグナルで強制終了された場合は status が null になり原因特定が困難なため、signal 名をログする
if (result.signal) {
  console.error(
    "prisma generate がシグナルで強制終了されました:",
    result.signal,
  );
}
process.exit(result.status ?? 1);
