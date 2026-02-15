/**
 * execution/shared エントリーポイント
 *
 * chat と agentExecutor で共有するモジュールをエクスポート
 */

// メタツール定義
export {
  DYNAMIC_SEARCH_META_TOOLS,
  META_TOOL_NAMES,
  isMetaToolName,
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
  type MetaToolDefinition,
} from "./metaToolDefinitions.js";

// スキーマとバリデーション
export {
  postRequestBodySchema,
  convertToolState,
  type PostRequestBody,
  type ToolState,
  type DBToolPart,
} from "./schema.js";

// メッセージ変換
export {
  convertDBMessagesToAISDK6Format,
  type UIMessage,
} from "./messageConverter.js";

// LLM設定
export {
  isReasoningModel,
  buildStreamTextConfig,
  type LLMConfigOptions,
  type StreamTextConfig,
} from "./llmConfig.js";
