/**
 * AI サービス クライアント用 API
 * クライアントコンポーネントで安全に使用できるモジュールのみエクスポート
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

// エンタイトルメント
export { entitlementsByUserType } from "./entitlements";

// 自動モデル選択
export {
  AUTO_MODEL_ID,
  isAutoModel,
  selectModelByTask,
  analyzeTaskComplexity,
  type TaskContext,
} from "./auto-model-selector";
