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
  CreateUnifiedMcpServerRequest,
  UpdateUnifiedMcpServerRequest,
  ChildServerResponse,
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
export { aggregateTools, getChildServers } from "./toolsAggregator.js";

// ツール実行サービス
export { executeUnifiedTool, getChildServerSettings } from "./toolExecutor.js";

// バリデーション
export {
  validateMcpServersInOrganization,
  validateOAuthTokensExist,
  type McpServerValidationResult,
  type OAuthTokenValidationResult,
} from "./validators.js";

// レスポンスマッパー
export {
  mapToUnifiedMcpServerResponse,
  mapToUnifiedMcpServerListResponse,
  type UnifiedServerWithChildren,
} from "./responseMapper.js";
