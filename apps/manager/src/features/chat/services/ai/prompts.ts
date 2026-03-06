/**
 * @tumiki/prompts からの re-export
 * manager 固有の RequestHints 型のみここで定義（Vercel Geo 型に依存）
 */

import type { Geo } from "@vercel/functions";

export {
  systemPrompt,
  getArtifactsPrompt as artifactsPrompt,
  getCodePrompt as codePrompt,
  getSheetPrompt as sheetPrompt,
  getUpdateDocumentPrompt as updateDocumentPrompt,
  getMcpToolsPrompt,
  getRequestPromptFromHints,
} from "@tumiki/prompts";

export type {
  ArtifactKind,
  SystemPromptOptions,
  SystemPromptResult,
} from "@tumiki/prompts";

/**
 * Vercel Geo 型に基づく位置情報ヒント
 */
export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};
