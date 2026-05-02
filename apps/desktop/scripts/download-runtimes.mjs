#!/usr/bin/env node
/**
 * Tumiki Desktop 用 ランタイムバンドルスクリプト
 *
 * Node.js / uv の公式バイナリをプラットフォーム別に取得し、
 * `apps/desktop/resources/runtime/<platform>/` 配下に展開する。
 *
 * 配置後の構造:
 *   resources/runtime/<platform>/
 *   ├── bin/   (node, npm, npx, uv, uvx)
 *   └── lib/   (Node.js の lib/node_modules/npm 等)
 *
 * electron-builder の extraResources で同梱され、本番では
 * `<App>.app/Contents/Resources/runtime/<platform>/` に配置される。
 *
 * 使い方:
 *   node scripts/download-runtimes.mjs              # 現在のプラットフォームのみ
 *   node scripts/download-runtimes.mjs --all        # サポート全プラットフォーム
 *   node scripts/download-runtimes.mjs --platform darwin-x64
 *   node scripts/download-runtimes.mjs --force      # 既存を再ダウンロード
 */

import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

const PLATFORM_MAP = {
  "darwin-arm64": {
    nodeArch: "darwin-arm64",
    uvTriple: "aarch64-apple-darwin",
  },
  "darwin-x64": { nodeArch: "darwin-x64", uvTriple: "x86_64-apple-darwin" },
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

/**
 * リダイレクト追従つき HTTPS ダウンロード（GitHub releases 等で必要）
 * curl サブプロセスを使う方が依存ゼロで簡潔なため、curl を採用する。
 */
const downloadTo = async (url, destPath) => {
  log(`  fetching ${url}`);
  await new Promise((resolve, reject) => {
    const child = spawn(
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
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl exit code ${code} for ${url}`));
    });
    child.on("error", reject);
  });
};

const extractTarGz = async (tarPath, destDir) => {
  log(`  extracting ${path.basename(tarPath)}`);
  await mkdir(destDir, { recursive: true });
  await new Promise((resolve, reject) => {
    const child = spawn("tar", ["-xzf", tarPath, "-C", destDir], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exit code ${code}`));
    });
    child.on("error", reject);
  });
};

const installNode = async (platform, target) => {
  const { nodeArch } = PLATFORM_MAP[platform];
  const version = VERSIONS.node;
  const baseName = `node-v${version}-${nodeArch}`;
  const url = `https://nodejs.org/dist/v${version}/${baseName}.tar.gz`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-node-"));
  try {
    const tarPath = path.join(tmpDir, `${baseName}.tar.gz`);
    await downloadTo(url, tarPath);
    await extractTarGz(tarPath, tmpDir);

    const extractedRoot = path.join(tmpDir, baseName);
    // bin/ と lib/ のみ採用（include/, share/ は不要）
    await cp(path.join(extractedRoot, "bin"), path.join(target, "bin"), {
      recursive: true,
      verbatimSymlinks: true,
    });
    await cp(path.join(extractedRoot, "lib"), path.join(target, "lib"), {
      recursive: true,
      verbatimSymlinks: true,
    });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

const installUv = async (platform, target) => {
  const { uvTriple } = PLATFORM_MAP[platform];
  const version = VERSIONS.uv;
  const baseName = `uv-${uvTriple}`;
  const url = `https://github.com/astral-sh/uv/releases/download/${version}/${baseName}.tar.gz`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "tumiki-uv-"));
  try {
    const tarPath = path.join(tmpDir, `${baseName}.tar.gz`);
    await downloadTo(url, tarPath);
    await extractTarGz(tarPath, tmpDir);

    const extractedRoot = path.join(tmpDir, baseName);
    const binDir = path.join(target, "bin");
    await mkdir(binDir, { recursive: true });
    await cp(path.join(extractedRoot, "uv"), path.join(binDir, "uv"));
    await cp(path.join(extractedRoot, "uvx"), path.join(binDir, "uvx"));
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
