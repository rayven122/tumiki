#!/usr/bin/env node
// Keycloak テーマインストールのクロスプラットフォームラッパ。
//
// 既存 `docker/keycloak/install-themes.sh` は bash 専用なので、
// bash 不在の環境（Windows cmd.exe / Alpine ベースの Docker イメージ等）
// では何もせずに正常終了する。
//
// - Windows: cmd.exe で `( ... )` のシェル構文が解釈不能 → スキップ
// - Alpine (node:24-alpine): bash 不在 → スキップ
// - macOS / Linux 開発環境 / Debian 系イメージ: bash 経由でインストール
import { spawnSync } from "node:child_process";

const skip = (reason) => {
  console.log(`Skipping keycloak theme install (${reason})`);
  process.exit(0);
};

if (process.platform === "win32") skip("Windows: bash not available");

// bash 実行ファイルが PATH に無いとき、spawnSync は ENOENT を返し
// `error` プロパティが入る。ESM 上で OS の bash 不在を検出する最も
// 確実な方法は実際に呼んでみること（which / command -v に依存しない）。
const probe = spawnSync("bash", ["-c", "exit 0"], { stdio: "ignore" });
if (probe.error || probe.status === null) {
  skip("bash not found in PATH");
}

const result = spawnSync("bash", ["docker/keycloak/install-themes.sh"], {
  stdio: "inherit",
});
if (result.error) {
  console.error(
    "keycloak theme install の実行に失敗しました:",
    result.error.message,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);
