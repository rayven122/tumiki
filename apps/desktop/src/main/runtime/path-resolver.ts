import { app } from "electron";
import path from "node:path";

/**
 * バンドル済みランタイム解決層
 *
 * Node.js / npm / npx / uv / uvx のいずれもバンドル済みバイナリへの
 * 絶対パスに解決する。
 *
 * 以前は node のみ Electron バイナリを `ELECTRON_RUN_AS_NODE=1` で起動する
 * shim 経由で動かしていた（ランタイム本体を ~119MB 節約する設計）が、
 * macOS では shim の起動毎に Launch Services が `.app/Contents/MacOS/Tumiki`
 * を Dock 登録してしまい、CLI モード（--mcp-proxy）で上流 STDIO MCP を
 * 起動する度に Dock アイコンが点灯する問題があった。
 * UX を優先し、公式 Node を同梱する方針に切替えて shim を廃止した。
 *
 * macOS GUI アプリは ~/.zshrc の PATH を引き継がないため、
 * バンドルバイナリを絶対パス + PATH に明示注入することで `spawn ENOENT` を回避する。
 */

/** バンドル済み bin ディレクトリの絶対パスをそのまま使うランタイム */
const BUNDLED_BIN_RUNTIMES = ["node", "npx", "npm", "uv", "uvx"] as const;

type BundledBinRuntime = (typeof BUNDLED_BIN_RUNTIMES)[number];

const isBundledBinRuntime = (value: string): value is BundledBinRuntime =>
  (BUNDLED_BIN_RUNTIMES as readonly string[]).includes(value);

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
 * Windows用の実行ファイル拡張子を付与する。
 */
const withExeSuffix = (name: string): string =>
  process.platform === "win32" ? `${name}.exe` : name;

/**
 * 既知ランタイムを実パスに解決する。
 * 全ランタイム共通でバンドル binディレクトリの該当ファイルを返す。
 */
const resolveKnownRuntime = (runtime: string): string | null => {
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

  // 後方互換: 旧データの "npx" 等もバンドル版に解決する
  if (isBundledBinRuntime(value)) {
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
 * バンドル binディレクトリ → 既存 PATH の優先順で組み立てる。
 * - npx 内部から `npm` / `node` を呼ぶ等のフォールバック用
 * - shebang `#!/usr/bin/env node` が PATH 経由でバンドル node を発見する
 */
export const buildChildEnv = (
  base: NodeJS.ProcessEnv,
  extra: Record<string, string> = {},
): Record<string, string> => {
  const bundledBinDir = getBundledBinDir();
  const separator = process.platform === "win32" ? ";" : ":";
  const existingPath = base.PATH ?? base.Path ?? "";
  const pathParts = [bundledBinDir, existingPath].filter((p) => p.length > 0);
  const newPath = pathParts.join(separator);

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...extra, PATH: newPath };
};
