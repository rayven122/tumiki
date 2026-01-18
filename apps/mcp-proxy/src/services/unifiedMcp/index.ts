/**
 * 統合MCPエンドポイント用サービス
 *
 * @namespace UnifiedMcp
 */

// 型定義
export type {
  ParsedToolName,
  AggregatedTool,
  ChildServerInfo,
  CachedUnifiedTools,
  CreateTemplateInstanceRequest,
  CreateUnifiedMcpServerRequest,
  UpdateUnifiedMcpServerRequest,
  ChildServerResponse,
  TemplateInstanceResponse,
  UnifiedMcpServerResponse,
  UnifiedMcpServerListResponse,
  UnifiedAuthContextExtension,
} from "./types.js";

// ツール名パーサー
export {
  parseUnifiedToolName,
  formatUnifiedToolName,
} from "./toolNameParser.js";

// ツール集約サービス
export { aggregateTools } from "./toolsAggregator.js";

// ツール実行サービス
export { executeUnifiedTool, getChildServerSettings } from "./toolExecutor.js";

// バリデーション
export {
  validateTemplatesInOrganization,
  validateOAuthTokensExist,
  type TemplateValidationResult,
  type OAuthTokenValidationResult,
} from "./validators.js";

// レスポンスマッパー
export {
  mapToUnifiedMcpServerResponse,
  mapToUnifiedMcpServerListResponse,
  type UnifiedServerWithTemplateInstances,
} from "./responseMapper.js";
