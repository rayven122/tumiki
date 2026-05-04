#!/usr/bin/env node
// Keycloak テーマインストールのクロスプラットフォームラッパ。
//
// 既存 `docker/keycloak/install-themes.sh` は bash 専用なので、
// cmd.exe でパースされる Windows ランナー上では実行できない。
// 本ラッパで OS 判定して Windows ではスキップする
// （CI windows-latest 等は keycloak テーマ不要、Tumiki Desktop ビルドのみ）。
import { spawnSync } from "node:child_process";

if (process.platform === "win32") {
  console.log("Skipping keycloak theme install (Windows: bash not available)");
  process.exit(0);
}

const result = spawnSync("bash", ["docker/keycloak/install-themes.sh"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
