import { app } from "electron";
import path from "node:path";

/**
 * バンドル済みランタイム解決層
 *
 * Electronにバンドルした Node.js / uv バイナリへのパスを解決する。
 * これにより、ユーザーPCに npx / uvx などがインストールされていなくても
 * MCPコネクタが起動できる。
 *
 * macOS GUIアプリは ~/.zshrc の PATH を引き継がないため、
 * バンドルバイナリを絶対パスで参照することで `spawn ENOENT` を回避する。
 */

/** バンドル対応のランタイム名 */
const KNOWN_RUNTIMES = ["node", "npx", "uv", "uvx"] as const;
type KnownRuntime = (typeof KNOWN_RUNTIMES)[number];

const isKnownRuntime = (value: string): value is KnownRuntime =>
  (KNOWN_RUNTIMES as readonly string[]).includes(value);

/** ${runtime:NAME} 形式のプレースホルダ */
const RUNTIME_PLACEHOLDER = /^\$\{runtime:([a-z]+)\}$/;

/**
 * バンドル binディレクトリ（プラットフォーム別）の絶対パスを返す。
 *
 * Node.js の tarball を `resources/runtime/<platform>/` に展開する設計のため、
 * Node 本体由来の `bin/` をそのまま使う形になる。uv / uvx もここにコピーする。
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
 * 現状サポートはmacOSのみだが、将来のWindows対応を見据えて抽象化しておく。
 */
const withExeSuffix = (name: string): string =>
  process.platform === "win32" ? `${name}.exe` : name;

/**
 * 既知ランタイムをバンドル binディレクトリ配下の絶対パスに解決する。
 * 不明なランタイム名は null を返す。
 */
const resolveKnownRuntime = (runtime: string): string | null => {
  if (!isKnownRuntime(runtime)) return null;
  return path.join(getBundledBinDir(), withExeSuffix(runtime));
};

/**
 * 単一の値を解決する。
 *
 * 1. `${runtime:NAME}` プレースホルダ → バンドル絶対パス
 * 2. 既知ランタイム名（"npx" など）の素の値 → バンドル絶対パス（後方互換）
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
  const bareResolved = resolveKnownRuntime(value);
  if (bareResolved) return bareResolved;

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
 * バンドル binディレクトリを PATH の先頭に挿入することで、
 * MCPサーバが内部で `node` や `npm` を呼ぶ場合もバンドル版を優先させる。
 */
export const buildChildEnv = (
  base: NodeJS.ProcessEnv,
  extra: Record<string, string> = {},
): Record<string, string> => {
  const binDir = getBundledBinDir();
  const separator = process.platform === "win32" ? ";" : ":";
  const existingPath = base.PATH ?? base.Path ?? "";
  const newPath = existingPath
    ? `${binDir}${separator}${existingPath}`
    : binDir;

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...extra, PATH: newPath };
};
