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
 * CI 環境（CI=true）では取得をスキップする。
 * typecheck / lint / test はランタイム実体を使わないため。
 */

import { spawn } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(__dirname, "..");
const RUNTIME_ROOT = path.join(DESKTOP_DIR, "resources", "runtime");

const VERSIONS = {
  node: "22.11.0",
  uv: "0.5.10",
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
    await runCommand("tar", [...flags, archivePath, "-C", destDir], "tar");
  }
};

const installNode = async (platform, target) => {
  const { nodeArch, archive, layout } = PLATFORM_MAP[platform];
  const baseName = `node-v${VERSIONS.node}-${nodeArch}`;
  const url = `https://nodejs.org/dist/v${VERSIONS.node}/${baseName}.${archive}`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-node-"));
  try {
    const archivePath = path.join(tmpDir, `${baseName}.${archive}`);
    await downloadTo(url, archivePath);
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
  const url = `https://github.com/astral-sh/uv/releases/download/${VERSIONS.uv}/${baseName}.${archive}`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-uv-"));
  try {
    const archivePath = path.join(tmpDir, `${baseName}.${archive}`);
    await downloadTo(url, archivePath);
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

const main = async () => {
  // CI 環境ではランタイム実体を使わない（typecheck/lint/test のみ）ためスキップ
  // 必要なら CI 上で `--force` 付きで明示実行することは可能（force だけではスキップは外れない設計）
  if (process.env.CI === "true") {
    log("CI 環境を検出 - ランタイム取得をスキップします");
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
