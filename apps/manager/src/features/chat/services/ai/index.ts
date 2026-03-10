/**
 * AI サービス公開 API
 * チャット機能で使用する AI 関連のモジュールをエクスポート
 */

// モデル定義
export {
  DEFAULT_CHAT_MODEL,
  chatModels,
  getModelById,
  getModelsByProvider,
  getModelsGroupedByProvider,
  modelsByProvider,
  providerLabels,
  providerOrder,
  type ChatModel,
  type ChatModelProvider,
} from "./models";

// プロバイダー
export {
  getArtifactModel,
  getLanguageModel,
  getTitleModel,
  myProvider,
} from "./providers";

// エンタイトルメント
export { entitlementsByUserType } from "./entitlements";

// プロンプト
export {
  systemPrompt,
  getMcpToolsPrompt,
  getRequestPromptFromHints,
  type RequestHints,
} from "./prompts";

// 注意: ツール（createDocument, updateDocument, requestSuggestions, getWeather, getMcpToolsFromServers）は
// サーバー専用モジュールに依存するため、循環参照を避けるためにバレルエクスポートから除外しています。
// 直接インポートしてください:
//   import { createDocument } from "@/features/chat/services/ai/tools/create-document";
//   import { updateDocument } from "@/features/chat/services/ai/tools/update-document";
//   import { requestSuggestions } from "@/features/chat/services/ai/tools/request-suggestions";
//   import { getWeather } from "@/features/chat/services/ai/tools/get-weather";
//   import { getMcpToolsFromServers } from "@/features/chat/services/ai/tools/mcp";
