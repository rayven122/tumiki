import { app } from "electron";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * バンドル済みランタイム解決層
 *
 * Electron 自体に内包されている Node.js ランタイムを再利用しつつ、
 * uv / uvx は別途バンドルしたバイナリへのパスを解決する。
 *
 * - node: Electron バイナリを `ELECTRON_RUN_AS_NODE=1` で起動する shim を
 *         userData/runtime/bin/ に生成し、その絶対パスを返す。
 *         (Electron 同梱の Node を使うため、ランタイム本体の追加バンドル不要 = ~119MB節約)
 * - npx / npm: バンドル済みの npm パッケージから JS スクリプト（symlink）を実行。
 *              内部 shebang `#!/usr/bin/env node` が PATH 経由で shim を発見する。
 * - uv / uvx: バンドル済みのバイナリ（Rust 単一ファイル）を直接実行。
 *
 * macOS GUI アプリは ~/.zshrc の PATH を引き継がないため、
 * バンドルバイナリ + shim を絶対パス + PATH に明示注入することで `spawn ENOENT` を回避する。
 */

/** Node 系: Electron-as-Node の shim 経由で実行する */
const NODE_SHIM_RUNTIMES = ["node"] as const;
/** バンドル済み bin ディレクトリの絶対パスをそのまま使うランタイム */
const BUNDLED_BIN_RUNTIMES = ["npx", "npm", "uv", "uvx"] as const;

type ShimRuntime = (typeof NODE_SHIM_RUNTIMES)[number];
type BundledBinRuntime = (typeof BUNDLED_BIN_RUNTIMES)[number];
type KnownRuntime = ShimRuntime | BundledBinRuntime;

const isShimRuntime = (value: string): value is ShimRuntime =>
  (NODE_SHIM_RUNTIMES as readonly string[]).includes(value);

const isBundledBinRuntime = (value: string): value is BundledBinRuntime =>
  (BUNDLED_BIN_RUNTIMES as readonly string[]).includes(value);

const isKnownRuntime = (value: string): value is KnownRuntime =>
  isShimRuntime(value) || isBundledBinRuntime(value);

/** ${runtime:NAME} 形式のプレースホルダ */
const RUNTIME_PLACEHOLDER = /^\$\{runtime:([a-z]+)\}$/;

/**
 * バンドル binディレクトリ（プラットフォーム別、読み取り専用）の絶対パスを返す。
 *
 * - production: `<App>.app/Contents/Resources/runtime/<platform>/bin/`
 * - development: `apps/desktop/resources/runtime/<platform>/bin/`
 */
const getBundledBinDir = (): string => {
  const platformDir = `${process.platform}-${process.arch}`;
  const baseDir = app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), "resources");
  return path.join(baseDir, "runtime", platformDir, "bin");
};

/**
 * Node shim を配置するディレクトリ（書き込み可能）の絶対パスを返す。
 *
 * パッケージ済みアプリの Resources は読み取り専用 (signed app) のため、
 * userData 配下に shim を生成する。
 */
const getShimDir = (): string => {
  return path.join(app.getPath("userData"), "runtime", "bin");
};

/**
 * Windows プラットフォームでのランタイム別実行ファイル拡張子。
 *
 * - node: Electron-as-Node の shim を `.cmd` で生成する（`ensureNodeShim()` 参照）
 * - npm / npx: Node.js Windows 配布物が `.cmd` ラッパとして配布されている
 *   （`scripts/download-runtimes.mjs` の `installNode()` で bin/ に配置）
 * - uv / uvx: Astral 公式が単体 `.exe` バイナリで配布
 */
const WINDOWS_RUNTIME_EXT: Record<KnownRuntime, ".cmd" | ".exe"> = {
  node: ".cmd",
  npm: ".cmd",
  npx: ".cmd",
  uv: ".exe",
  uvx: ".exe",
};

/**
 * 実行ホストに合わせて拡張子を付与する。
 * - Windows: `WINDOWS_RUNTIME_EXT` の通り（.cmd / .exe）
 * - POSIX:   拡張子なし
 */
const appendPlatformExt = (runtime: KnownRuntime): string =>
  process.platform === "win32"
    ? `${runtime}${WINDOWS_RUNTIME_EXT[runtime]}`
    : runtime;

/**
 * 既知ランタイムを実パスに解決する。
 * - node: shim ディレクトリの shim を返す（要 `ensureNodeShim()` 事前呼び出し）
 * - npx/npm/uv/uvx: バンドル binディレクトリの該当ファイルを返す
 */
const resolveKnownRuntime = (runtime: string): string | null => {
  if (isShimRuntime(runtime)) {
    return path.join(getShimDir(), appendPlatformExt(runtime));
  }
  if (isBundledBinRuntime(runtime)) {
    return path.join(getBundledBinDir(), appendPlatformExt(runtime));
  }
  return null;
};

/**
 * 単一の値を解決する。
 *
 * 1. `${runtime:NAME}` プレースホルダ → 実パス
 * 2. 既知ランタイム名（"npx" など）の素の値 → 実パス（後方互換）
 * 3. それ以外 → 素通し
 */
export const resolveValue = (value: string): string => {
  const placeholderMatch = RUNTIME_PLACEHOLDER.exec(value);
  if (placeholderMatch) {
    const runtime = placeholderMatch[1] ?? "";
    const resolved = resolveKnownRuntime(runtime);
    if (!resolved) {
      throw new Error(`未知のランタイムプレースホルダ: ${value}`);
    }
    return resolved;
  }

  // 後方互換: 旧データの "npx" 等もバンドル版/shim に解決する
  if (isKnownRuntime(value)) {
    const resolved = resolveKnownRuntime(value);
    if (resolved) return resolved;
  }

  return value;
};

/**
 * args 配列の各要素にプレースホルダ解決を適用する。
 */
export const resolveArgs = (args: readonly string[]): string[] =>
  args.map(resolveValue);

/**
 * 子プロセスの env を構築する。
 *
 * shim ディレクトリ → バンドル binディレクトリ → 既存 PATH の優先順で組み立てる。
 * - shim ディレクトリが先頭: `env node` 系 shebang が必ず Electron-as-Node を見つける
 * - バンドル bin ディレクトリ: npx 内部から `npm` を呼ぶ等のフォールバック
 */
export const buildChildEnv = (
  base: NodeJS.ProcessEnv,
  extra: Record<string, string> = {},
): Record<string, string> => {
  const shimDir = getShimDir();
  const bundledBinDir = getBundledBinDir();
  const separator = process.platform === "win32" ? ";" : ":";
  const existingPath = base.PATH ?? base.Path ?? "";
  const pathParts = [shimDir, bundledBinDir, existingPath].filter(
    (p) => p.length > 0,
  );
  const newPath = pathParts.join(separator);

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...extra, PATH: newPath };
};

/**
 * POSIX 用 sh shim の内容を生成する。
 * `sh` の単一引用符内エスケープを使い、execPath に `'` が含まれても安全に展開する。
 */
const buildPosixShim = (electronPath: string): string => {
  const escaped = `'${electronPath.replace(/'/g, `'\\''`)}'`;
  return `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec ${escaped} "$@"\n`;
};

/**
 * Windows 用 .cmd shim の内容を生成する。
 *
 * - CRLF 改行: cmd.exe は LF のみのバッチファイルでも動作するが、
 *   標準慣習・テキストエディタでの可読性のため CRLF に揃える
 * - `setlocal`: ELECTRON_RUN_AS_NODE が呼び出し元プロセスに漏れないようにする
 * - `%*` で引数を素通し: cmd.exe が引用符付き引数を保つため追加処理は不要
 *
 * execPath に `"` が含まれる極端なケースを想定し、内部の `"` を `""` に倍化して
 * バッチ内の引用符として正しく解釈させる。さらに `%` は cmd.exe で変数展開の
 * メタ文字として扱われるため、`%%` に倍化して意図しない展開を防ぐ。
 */
const buildWindowsShim = (electronPath: string): string => {
  const escaped = electronPath.replace(/"/g, '""').replace(/%/g, "%%");
  return [
    "@echo off",
    "setlocal",
    "set ELECTRON_RUN_AS_NODE=1",
    `"${escaped}" %*`,
    "",
  ].join("\r\n");
};

/**
 * Node shim をユーザーデータ領域に生成する（冪等）。
 *
 * Electron 同梱の Node ランタイムを使うため、`ELECTRON_RUN_AS_NODE=1` を設定して
 * 現在の Electron バイナリを exec する shim スクリプトを書き出す。
 *
 * アプリ起動時に1度呼ぶことを想定。`process.execPath` が変わった場合（アプリ更新等）
 * は内容差分を見て上書きする。
 *
 * プラットフォーム別の差分:
 * - POSIX:   `node`     - `#!/bin/sh` + `exec` で Electron を起動（実行権限 0o755）
 * - Windows: `node.cmd` - cmd バッチで `set ELECTRON_RUN_AS_NODE=1` + Electron 起動
 *            （NTFS は POSIX 実行権限を持たないため chmod 不要）
 */
export const ensureNodeShim = (): void => {
  const shimDir = getShimDir();
  mkdirSync(shimDir, { recursive: true });

  const electronPath = process.execPath;
  const isWindows = process.platform === "win32";
  const shimPath = path.join(shimDir, isWindows ? "node.cmd" : "node");
  const content = isWindows
    ? buildWindowsShim(electronPath)
    : buildPosixShim(electronPath);

  // 既存 shim と内容が同一ならスキップ（書き込み回数とinode変更を最小化）
  try {
    if (readFileSync(shimPath, "utf8") === content) return;
  } catch {
    // ファイル未存在等 → 新規作成へ進む
  }

  writeFileSync(shimPath, content, { encoding: "utf8" });
  if (!isWindows) chmodSync(shimPath, 0o755);
};
