/**
 * 統合MCPエンドポイント用の型定義
 */

import type { ServerStatus } from "@tumiki/db";
import type { JsonValue } from "@prisma/client/runtime/library";

// ============================================================================
// ツール関連の型定義
// ============================================================================

/**
 * 3階層ツール名のパース結果
 * フォーマット: `{mcpServerId}__{instanceName}__{toolName}`
 */
export type ParsedToolName = {
  mcpServerId: string;
  instanceName: string;
  toolName: string;
};

/**
 * 集約されたツール情報
 * 複数のMCPサーバーからのツールを3階層フォーマットで統合した形式
 */
export type AggregatedTool = {
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown>;
  mcpServerId: string;
  instanceName: string;
};

/**
 * キャッシュ用の集約ツール情報（Redisシリアライズ形式）
 */
export type CachedUnifiedTools = {
  tools: AggregatedTool[];
  cachedAt: string;
};

// ============================================================================
// サーバー関連の型定義
// ============================================================================

/** テンプレートインスタンスのツール情報 */
type TemplateInstanceTool = {
  name: string;
  description: string;
  inputSchema: JsonValue;
};

/** テンプレートインスタンス情報 */
type TemplateInstance = {
  id: string;
  normalizedName: string;
  allowedTools: TemplateInstanceTool[];
};

/**
 * 子MCPサーバー情報（tools/list用）
 * deletedAt: null は論理削除されていないサーバーのみを表す
 */
export type ChildServerInfo = {
  id: string;
  name: string;
  serverStatus: ServerStatus;
  deletedAt: null;
  templateInstances: TemplateInstance[];
};

// ============================================================================
// リクエスト/レスポンス型定義
// ============================================================================

/** テンプレートインスタンス作成リクエスト */
export type CreateTemplateInstanceRequest = {
  templateId: string;
  normalizedName: string;
  isEnabled?: boolean;
};

/** 統合MCPサーバー作成リクエスト */
export type CreateUnifiedMcpServerRequest = {
  name: string;
  description: string;
  templates: CreateTemplateInstanceRequest[];
};

/** 統合MCPサーバー更新リクエスト */
export type UpdateUnifiedMcpServerRequest = {
  name?: string;
  description?: string;
  templates?: CreateTemplateInstanceRequest[];
};

/** 子MCPサーバーのレスポンス形式 */
export type ChildServerResponse = {
  id: string;
  name: string;
  serverStatus: ServerStatus;
};

/** テンプレートインスタンスのレスポンス形式（UNIFIED用） */
export type TemplateInstanceResponse = {
  id: string;
  normalizedName: string;
  templateName: string;
  templateId: string;
  displayOrder: number;
  isEnabled: boolean;
};

/** 統合MCPサーバーレスポンス */
export type UnifiedMcpServerResponse = {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  templateInstances: TemplateInstanceResponse[];
  createdAt: string;
  updatedAt: string;
};

/** 統合MCPサーバー一覧レスポンス */
export type UnifiedMcpServerListResponse = {
  items: UnifiedMcpServerResponse[];
};

// ============================================================================
// 認証関連の型定義
// ============================================================================

/** 統合エンドポイント用の認証コンテキスト拡張フィールド */
export type UnifiedAuthContextExtension = {
  isUnifiedEndpoint: boolean;
  unifiedMcpServerId: string;
};
