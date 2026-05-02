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
 * Windows用の実行ファイル拡張子を付与する。
 * 現状サポートはmacOSのみだが、将来のWindows対応を見据えて抽象化しておく。
 */
const withExeSuffix = (name: string): string =>
  process.platform === "win32" ? `${name}.exe` : name;

/**
 * 既知ランタイムを実パスに解決する。
 * - node: shim ディレクトリの shim を返す（要 `ensureNodeShim()` 事前呼び出し）
 * - npx/npm/uv/uvx: バンドル binディレクトリの該当ファイルを返す
 */
const resolveKnownRuntime = (runtime: string): string | null => {
  if (isShimRuntime(runtime)) {
    return path.join(getShimDir(), withExeSuffix(runtime));
  }
  if (isBundledBinRuntime(runtime)) {
    return path.join(getBundledBinDir(), withExeSuffix(runtime));
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
 * Node shim をユーザーデータ領域に生成する（冪等）。
 *
 * Electron 同梱の Node ランタイムを使うため、`ELECTRON_RUN_AS_NODE=1` を設定して
 * 現在の Electron バイナリを exec する shim スクリプトを書き出す。
 *
 * アプリ起動時に1度呼ぶことを想定。`process.execPath` が変わった場合（アプリ更新等）
 * は内容差分を見て上書きする。
 */
export const ensureNodeShim = (): void => {
  if (process.platform === "win32") {
    // TODO(DEV-1597 後続): Windows 用 .cmd shim 対応
    return;
  }

  const shimDir = getShimDir();
  mkdirSync(shimDir, { recursive: true });

  const shimPath = path.join(shimDir, "node");
  const electronPath = process.execPath;
  // sh の単一引用符でエスケープ。電子パスに ' が含まれる極端なケースに対応。
  const escaped = `'${electronPath.replace(/'/g, `'\\''`)}'`;
  const content = `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec ${escaped} "$@"\n`;

  // 既存 shim と内容が同一ならスキップ（書き込み回数とinode変更を最小化）
  try {
    if (readFileSync(shimPath, "utf8") === content) return;
  } catch {
    // ファイル未存在等 → 新規作成へ進む
  }

  writeFileSync(shimPath, content, { encoding: "utf8" });
  chmodSync(shimPath, 0o755);
};
