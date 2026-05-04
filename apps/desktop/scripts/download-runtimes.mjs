#!/usr/bin/env node
/**
 * Tumiki Desktop 用 ランタイムバンドルスクリプト
 *
 * Node.js / uv の公式配布物をプラットフォーム別に取得し、
 * `apps/desktop/resources/runtime/<platform>/` 配下に展開する。
 *
 * Node 本体（bin/node）は Electron に内包されたランタイムを再利用するため
 * **同梱しない**（実行時に userData/runtime/bin/node という shim スクリプトを
 * 生成して `ELECTRON_RUN_AS_NODE=1` で Electron バイナリを exec する設計）。
 * これにより約 119MB / プラットフォーム のサイズ削減を達成する。
 *
 * 配置後の構造:
 *   resources/runtime/<platform>/
 *   ├── bin/   (npm/npx スクリプト + uv/uvx バイナリ)
 *   └── lib/   (POSIXのみ。Node 配布物の lib/node_modules/{npm,corepack})
 *
 * electron-builder の extraResources で同梱され、本番では
 * `<App>.app/Contents/Resources/runtime/<platform>/` に配置される。
 *
 * 使い方:
 *   node scripts/download-runtimes.mjs              # 現在のプラットフォームのみ
 *   node scripts/download-runtimes.mjs --all        # サポート全プラットフォーム
 *   node scripts/download-runtimes.mjs --platform darwin-x64
 *   node scripts/download-runtimes.mjs --force      # 既存を再ダウンロード
 *
 * CI 環境（CI=true）では引数なしで呼ばれた時のみスキップする。
 * - 引数なし（`pnpm install` の postinstall）: typecheck / lint / test では
 *   ランタイム実体は不要なためスキップ
 * - `--all` / `--platform` / `--force` 付き: リリースビルドの意図とみなし
 *   CI 上でも実行（`pnpm build:release` がこれに該当）
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(__dirname, "..");
const RUNTIME_ROOT = path.join(DESKTOP_DIR, "resources", "runtime");

// uv は 0.5.27 から Windows ARM64 (aarch64-pc-windows-msvc) アセットを配布開始。
// DEV-1598: Windows リリースビルドで win32-arm64 もサポートするため 0.7.21 に統一。
// （0.5.10 のままだと win-arm64 アセット不在で 404）
const VERSIONS = {
  node: "22.11.0",
  uv: "0.7.21",
};

/**
 * プラットフォーム別配布物の定義
 * - nodeArch: Node 公式 tarball/zip のサフィックス
 * - uvTriple: astral-sh/uv リリースの target triple
 * - archive : 配布形式（"tar.gz" or "zip"）
 * - layout  : "posix" = bin/ + lib/ 構造 / "win" = 全ファイル平置き（Node Windows 配布物の構造）
 */
const PLATFORM_MAP = {
  "darwin-arm64": {
    nodeArch: "darwin-arm64",
    uvTriple: "aarch64-apple-darwin",
    archive: "tar.gz",
    layout: "posix",
  },
  "darwin-x64": {
    nodeArch: "darwin-x64",
    uvTriple: "x86_64-apple-darwin",
    archive: "tar.gz",
    layout: "posix",
  },
  "linux-x64": {
    nodeArch: "linux-x64",
    uvTriple: "x86_64-unknown-linux-gnu",
    archive: "tar.gz",
    layout: "posix",
  },
  "linux-arm64": {
    nodeArch: "linux-arm64",
    uvTriple: "aarch64-unknown-linux-gnu",
    archive: "tar.gz",
    layout: "posix",
  },
  "win32-x64": {
    nodeArch: "win-x64",
    uvTriple: "x86_64-pc-windows-msvc",
    archive: "zip",
    layout: "win",
  },
  "win32-arm64": {
    nodeArch: "win-arm64",
    uvTriple: "aarch64-pc-windows-msvc",
    archive: "zip",
    layout: "win",
  },
};

const log = (msg) => console.log(`[download-runtimes] ${msg}`);

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const detectPlatform = () => `${process.platform}-${process.arch}`;

const parseArgs = () => {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  if (argv.includes("--all")) {
    return { platforms: Object.keys(PLATFORM_MAP), force };
  }
  const platformIndex = argv.indexOf("--platform");
  if (platformIndex >= 0 && argv[platformIndex + 1]) {
    return { platforms: [argv[platformIndex + 1]], force };
  }
  return { platforms: [detectPlatform()], force };
};

const runCommand = async (command, args, label) => {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "inherit"],
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exit code ${code}`));
    });
    child.on("error", reject);
  });
};

/**
 * リダイレクト追従つき HTTPS ダウンロード（GitHub releases 等で必要）
 * curl サブプロセスを使う方が依存ゼロで簡潔なため、curl を採用する。
 */
const downloadTo = async (url, destPath) => {
  log(`  fetching ${url}`);
  await runCommand(
    "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--output",
      destPath,
      url,
    ],
    `curl ${url}`,
  );
};

/**
 * ファイルの SHA256 ハッシュを計算する（ストリーミング）。
 * 大きなアーカイブをメモリに載せずに済むよう createHash + stream pipeline を使用。
 */
const computeSha256 = async (filePath) => {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex").toLowerCase();
};

/**
 * ダウンロード済みファイルの SHA256 を期待値と照合する。
 * サプライチェーン攻撃 (CDN 侵害 / MITM 等) で改ざんされたバイナリ実行を防ぐ。
 */
const verifySha256 = async (filePath, expectedHex) => {
  const actual = await computeSha256(filePath);
  const expected = expectedHex.trim().toLowerCase();
  if (actual !== expected) {
    throw new Error(
      `SHA256 mismatch for ${path.basename(filePath)}: expected ${expected}, got ${actual}`,
    );
  }
};

/**
 * Node.js 公式 SHASUMS256.txt から指定アーカイブのチェックサムを取得する。
 * フォーマット例:
 *   "abc123...  node-v22.11.0-darwin-arm64.tar.gz"
 */
const fetchNodeChecksum = async (filename) => {
  const url = `https://nodejs.org/dist/v${VERSIONS.node}/SHASUMS256.txt`;
  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-shasums-"));
  try {
    const sumsPath = path.join(tmpDir, "SHASUMS256.txt");
    await downloadTo(url, sumsPath);
    const content = await readFile(sumsPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([0-9a-f]+)\s+(.+)$/i);
      if (match && match[2].trim() === filename) {
        return match[1];
      }
    }
    throw new Error(`SHASUMS256.txt に ${filename} のエントリがありません`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

/**
 * astral-sh/uv リリースの `<archive>.sha256` ファイルからチェックサムを取得する。
 * フォーマット例:
 *   "abc123...  uv-aarch64-apple-darwin.tar.gz"
 */
const fetchUvChecksum = async (archiveUrl) => {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-uvshasum-"));
  try {
    const sumsPath = path.join(tmpDir, "checksum.txt");
    await downloadTo(`${archiveUrl}.sha256`, sumsPath);
    const content = (await readFile(sumsPath, "utf8")).trim();
    const match = content.match(/^([0-9a-f]+)/i);
    if (!match) {
      throw new Error(`uv チェックサムフォーマットが不正: ${content}`);
    }
    return match[1];
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

/**
 * Windows 上で tar コマンドを呼ぶときは `C:\Windows\System32\tar.exe`
 * （Win10+ 同梱の bsdtar / libarchive）を絶対パスで指定する。
 *
 * windows-latest ランナーには Git for Windows 同梱の GNU tar も入っており、
 * PATH 解決によってはこちらが先に拾われる。GNU tar は `C:\foo\bar.tar.gz`
 * の `C:` を host:path のリモート指定として解釈し
 * `tar (child): Cannot connect to C: resolve failed` で落ちるため、
 * 必ず bsdtar を呼ぶよう絶対パス指定で固定する（bsdtar は Windows パスを
 * 正しく扱い、tar.gz と zip の両方に対応）。
 */
const tarBinary = () =>
  process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";

/**
 * tar.gz / zip を抽出する。
 * libarchive (macOS/Linux/Win10+ 標準 tar) は zip を自動検出するが、
 * GNU tar は zip 非対応なので Linux 上は unzip を併用する。
 */
const extractArchive = async (archivePath, destDir, archive) => {
  log(`  extracting ${path.basename(archivePath)}`);
  await mkdir(destDir, { recursive: true });
  if (archive === "zip" && process.platform === "linux") {
    await runCommand("unzip", ["-q", archivePath, "-d", destDir], "unzip");
  } else {
    // tar.gz / macOS の zip 共通: tar に任せる
    const flags = archive === "zip" ? ["-xf"] : ["-xzf"];
    await runCommand(
      tarBinary(),
      [...flags, archivePath, "-C", destDir],
      "tar",
    );
  }
};

const installNode = async (platform, target) => {
  const { nodeArch, archive, layout } = PLATFORM_MAP[platform];
  const baseName = `node-v${VERSIONS.node}-${nodeArch}`;
  const archiveName = `${baseName}.${archive}`;
  const url = `https://nodejs.org/dist/v${VERSIONS.node}/${archiveName}`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-node-"));
  try {
    const archivePath = path.join(tmpDir, archiveName);
    await downloadTo(url, archivePath);
    log(`  verifying SHA256 (${archiveName})`);
    const expected = await fetchNodeChecksum(archiveName);
    await verifySha256(archivePath, expected);
    await extractArchive(archivePath, tmpDir, archive);

    const extractedRoot = path.join(tmpDir, baseName);
    const binDir = path.join(target, "bin");
    await mkdir(binDir, { recursive: true });

    if (layout === "win") {
      // Windows 配布物は全ファイルが root に平置き。
      // npm/npx の .cmd は ../node_modules を見るため、bin/ 配下に同居させる。
      await cp(
        path.join(extractedRoot, "npm.cmd"),
        path.join(binDir, "npm.cmd"),
      );
      await cp(
        path.join(extractedRoot, "npx.cmd"),
        path.join(binDir, "npx.cmd"),
      );
      await cp(
        path.join(extractedRoot, "node_modules"),
        path.join(binDir, "node_modules"),
        { recursive: true, verbatimSymlinks: true },
      );
      // node.exe は Electron 同梱を流用するため同梱しない
    } else {
      // POSIX: bin/ と lib/ をそのまま採用（include/, share/ は不要）
      await cp(path.join(extractedRoot, "bin"), binDir, {
        recursive: true,
        verbatimSymlinks: true,
      });
      await cp(path.join(extractedRoot, "lib"), path.join(target, "lib"), {
        recursive: true,
        verbatimSymlinks: true,
      });
      // bin/node は Electron 同梱の Node を流用するため削除（~119MB節約）
      try {
        await unlink(path.join(binDir, "node"));
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

const installUv = async (platform, target) => {
  const { uvTriple, archive } = PLATFORM_MAP[platform];
  const baseName = `uv-${uvTriple}`;
  const archiveName = `${baseName}.${archive}`;
  const url = `https://github.com/astral-sh/uv/releases/download/${VERSIONS.uv}/${archiveName}`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-uv-"));
  try {
    const archivePath = path.join(tmpDir, archiveName);
    await downloadTo(url, archivePath);
    log(`  verifying SHA256 (${archiveName})`);
    const expected = await fetchUvChecksum(url);
    await verifySha256(archivePath, expected);
    await extractArchive(archivePath, tmpDir, archive);

    // 配布形式の差を吸収:
    //   tar.gz: uv-<triple>/uv, uv-<triple>/uvx （ディレクトリ階層あり）
    //   zip   : uv.exe, uvx.exe （root に平置き）
    const extractedRoot =
      archive === "zip" ? tmpDir : path.join(tmpDir, baseName);
    const binDir = path.join(target, "bin");
    const exeSuffix = archive === "zip" ? ".exe" : "";
    await mkdir(binDir, { recursive: true });
    await cp(
      path.join(extractedRoot, `uv${exeSuffix}`),
      path.join(binDir, `uv${exeSuffix}`),
    );
    await cp(
      path.join(extractedRoot, `uvx${exeSuffix}`),
      path.join(binDir, `uvx${exeSuffix}`),
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

const setupPlatform = async (platform, force) => {
  if (!PLATFORM_MAP[platform]) {
    throw new Error(
      `未対応プラットフォーム: ${platform} (対応: ${Object.keys(PLATFORM_MAP).join(", ")})`,
    );
  }
  const target = path.join(RUNTIME_ROOT, platform);
  const sentinel = path.join(target, ".tumiki-runtime.json");

  if (!force && (await exists(sentinel))) {
    log(`${platform}: 既にインストール済み（--force で再取得）`);
    return;
  }

  log(`${platform}: セットアップ開始`);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  await installNode(platform, target);
  await installUv(platform, target);

  // sentinel ファイルでバージョンを記録（再ダウンロード判定用）
  const meta = {
    versions: VERSIONS,
    installedAt: new Date().toISOString(),
  };
  await writeFile(sentinel, JSON.stringify(meta, null, 2));

  log(`${platform}: 完了 → ${path.relative(DESKTOP_DIR, target)}`);
};

/**
 * CI 上で「リリースビルド意図」を示すフラグが渡されているかを判定する。
 *
 * `pnpm build:release` のような明示的な呼び出しでは `--all` が付くため、
 * これを「CI でも実体取得を行うべきシーン」として識別する。
 * 引数なしの `pnpm install` postinstall は従来通り CI ではスキップ対象。
 */
const isExplicitReleaseInvocation = (argv) =>
  argv.includes("--all") ||
  argv.includes("--platform") ||
  argv.includes("--force");

const main = async () => {
  const argv = process.argv.slice(2);
  if (process.env.CI === "true" && !isExplicitReleaseInvocation(argv)) {
    log(
      "CI 環境を検出 - 引数なしのためランタイム取得をスキップします（--all/--platform/--force で強制可）",
    );
    return;
  }

  const { platforms, force } = parseArgs();
  log(
    `対象プラットフォーム: ${platforms.join(", ")}${force ? " (--force)" : ""}`,
  );
  for (const platform of platforms) {
    await setupPlatform(platform, force);
  }
  log("すべてのランタイム取得が完了しました");
};

main().catch((error) => {
  console.error(`[download-runtimes] エラー: ${error.message}`);
  process.exitCode = 1;
});
