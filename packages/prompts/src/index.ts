/**
 * @tumiki/prompts パッケージエントリーポイント
 *
 * システムプロンプトの組み立て、ペルソナ管理、指示プロンプトを提供する
 */

// メイン API
export { systemPrompt } from "./systemPrompt.js";
export { loadPersona, listPersonas } from "./personas.js";
export {
  getArtifactsPrompt,
  getCodePrompt,
  getSheetPrompt,
  getUpdateDocumentPrompt,
  loadInstruction,
} from "./instructions.js";
export { getMcpToolsPrompt } from "./mcpToolsPrompt.js";
export { getRequestPromptFromHints } from "./requestHints.js";

// 型
export type {
  ArtifactKind,
  Persona,
  PersonaMetadata,
  PromptSection,
  RequestHints,
  SystemPromptOptions,
  SystemPromptResult,
} from "./types.js";

// ローダーユーティリティ（テスト用）
export { clearCache } from "./loader.js";
