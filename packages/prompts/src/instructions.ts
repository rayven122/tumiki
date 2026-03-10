/**
 * 指示プロンプト読み込み
 *
 * instructions/ ディレクトリの .md ファイルを読み込む
 */

import { join } from "node:path";

import type { ArtifactKind } from "./types.js";
import { readMarkdownFile, resolveContentDir } from "./loader.js";

/**
 * 指定名の指示プロンプトを読み込む
 */
export const loadInstruction = (name: string): string => {
  const dir = resolveContentDir("instructions");
  return readMarkdownFile(join(dir, `${name}.md`));
};

/**
 * Artifacts ツール利用ガイドを読み込む
 */
export const getArtifactsPrompt = (): string => loadInstruction("artifacts");

/**
 * コード生成指示を読み込む
 */
export const getCodePrompt = (): string => loadInstruction("code");

/**
 * スプレッドシート生成指示を読み込む
 */
export const getSheetPrompt = (): string => loadInstruction("sheet");

/**
 * ドキュメント更新プロンプトを生成
 */
export const getUpdateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
): string => {
  const promptByType: Record<string, string> = {
    text: "Improve the following contents of the document based on the given prompt.",
    code: "Improve the following code snippet based on the given prompt.",
    sheet: "Improve the following spreadsheet based on the given prompt.",
  };

  const prompt = promptByType[type];
  if (!prompt) return "";

  return `${prompt}\n\n${currentContent}`;
};
