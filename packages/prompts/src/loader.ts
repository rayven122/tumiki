/**
 * .md ファイルの読み込み・パース・キャッシュ
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PersonaMetadata } from "./types.js";

// ESM では __dirname が利用不可のため import.meta.url から取得
const __dirname = dirname(fileURLToPath(import.meta.url));

// モジュールスコープのファイルキャッシュ
const fileCache = new Map<string, string>();

/**
 * YAML frontmatter をパースしてメタデータ + 本文を返す
 */
export const parseFrontmatter = (
  raw: string,
): { metadata: Record<string, string>; content: string } => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) {
    return { metadata: {}, content: raw.trim() };
  }

  const yamlBlock = match[1] ?? "";
  const content = (match[2] ?? "").trim();

  const metadata: Record<string, string> = {};
  for (const line of yamlBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) {
      metadata[key] = value;
    }
  }

  return { metadata, content };
};

/**
 * frontmatter を PersonaMetadata として検証・変換する
 */
export const validatePersonaMetadata = (
  metadata: Record<string, string>,
): PersonaMetadata => {
  const { id, name, description, icon } = metadata;
  if (!id || !name || !description) {
    throw new Error(
      `ペルソナメタデータの必須フィールドが不足: ${JSON.stringify(metadata)}`,
    );
  }
  return { id, name, description, icon: icon || undefined };
};

/**
 * .md ファイルを読み込む（キャッシュ付き）
 */
export const readMarkdownFile = (filePath: string): string => {
  const cached = fileCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }

  const content = readFileSync(filePath, "utf-8");
  fileCache.set(filePath, content);
  return content;
};

/**
 * 指定ディレクトリ内の .md ファイル名一覧を取得
 */
export const listMarkdownFiles = (dirPath: string): string[] => {
  try {
    return readdirSync(dirPath).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
};

/**
 * コンテンツディレクトリのパスを解決する
 * build 時に .md を dist/ へコピーしているため __dirname 起点で解決
 */
export const resolveContentDir = (subdir: string): string =>
  join(__dirname, subdir);

/**
 * ファイルキャッシュをクリアする（テスト用）
 */
export const clearCache = (): void => {
  fileCache.clear();
};
