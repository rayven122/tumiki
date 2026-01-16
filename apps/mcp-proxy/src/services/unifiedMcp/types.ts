/**
 * 統合MCPエンドポイント用の型定義
 *
 * @namespace UnifiedMcp
 */

import type { ServerStatus } from "@tumiki/db";
import type { JsonValue } from "@prisma/client/runtime/library";

/**
 * 3階層ツール名のパース結果
 *
 * フォーマット: `{mcpServerId}__{instanceName}__{toolName}`
 */
export type ParsedToolName = {
  /** MCPサーバーID */
  mcpServerId: string;
  /** テンプレートインスタンスの正規化名 */
  instanceName: string;
  /** ツール名（MCPツールの元の名前） */
  toolName: string;
};

/**
 * 集約されたツール情報
 *
 * 複数のMCPサーバーからのツールを3階層フォーマットで統合した形式
 */
export type AggregatedTool = {
  /** 3階層フォーマットのツール名 */
  name: string;
  /** ツールの説明 */
  description: string | null;
  /** ツールの入力スキーマ（JSON Schema形式） */
  inputSchema: Record<string, unknown>;
  /** 元のMCPサーバーID（ログ記録用） */
  mcpServerId: string;
  /** テンプレートインスタンス名（デバッグ用） */
  instanceName: string;
};

/**
 * 子MCPサーバー情報（tools/list用）
 */
export type ChildServerInfo = {
  /** MCPサーバーID */
  id: string;
  /** MCPサーバー名 */
  name: string;
  /** サーバー状態 */
  serverStatus: ServerStatus;
  /** 論理削除タイムスタンプ */
  deletedAt: null; // 論理削除されていないサーバーのみを表す
  /** テンプレートインスタンス一覧 */
  templateInstances: Array<{
    /** インスタンスID */
    id: string;
    /** 正規化名 */
    normalizedName: string;
    /** 有効化されたツール一覧 */
    allowedTools: Array<{
      /** ツール名 */
      name: string;
      /** ツールの説明 */
      description: string;
      /** 入力スキーマ（Prisma JsonValue型） */
      inputSchema: JsonValue;
    }>;
  }>;
};

/**
 * キャッシュ用の集約ツール情報
 *
 * Redisに保存する際のシリアライズ形式
 */
export type CachedUnifiedTools = {
  /** 集約されたツール一覧 */
  tools: AggregatedTool[];
  /** キャッシュ作成時刻（ISO8601形式） */
  cachedAt: string;
};

/**
 * 統合MCPサーバー作成リクエスト
 */
export type CreateUnifiedMcpServerRequest = {
  /** 統合サーバー名（必須） */
  name: string;
  /** 統合サーバーの説明（オプショナル） */
  description?: string;
  /** 子MCPサーバーIDの配列（最低1件必須） */
  mcpServerIds: string[];
};

/**
 * 統合MCPサーバー更新リクエスト
 */
export type UpdateUnifiedMcpServerRequest = {
  /** 統合サーバー名（オプショナル） */
  name?: string;
  /** 統合サーバーの説明（オプショナル） */
  description?: string;
  /** 子MCPサーバーIDの配列（指定した場合は完全置換、最低1件必須） */
  mcpServerIds?: string[];
};

/**
 * 子MCPサーバーのレスポンス形式
 */
export type ChildServerResponse = {
  /** MCPサーバーID */
  id: string;
  /** MCPサーバー名 */
  name: string;
  /** サーバー状態 */
  serverStatus: ServerStatus;
};

/**
 * 統合MCPサーバーレスポンス
 */
export type UnifiedMcpServerResponse = {
  /** 統合サーバーID */
  id: string;
  /** 統合サーバー名 */
  name: string;
  /** 統合サーバーの説明 */
  description: string | null;
  /** 組織ID */
  organizationId: string;
  /** 作成者ID */
  createdBy: string;
  /** 子MCPサーバー一覧 */
  mcpServers: ChildServerResponse[];
  /** 作成日時（ISO8601形式） */
  createdAt: string;
  /** 更新日時（ISO8601形式） */
  updatedAt: string;
};

/**
 * 統合MCPサーバー一覧レスポンス
 */
export type UnifiedMcpServerListResponse = {
  /** 統合サーバー一覧 */
  items: UnifiedMcpServerResponse[];
};

/**
 * 統合エンドポイント用の認証コンテキスト拡張フィールド
 */
export type UnifiedAuthContextExtension = {
  /** 統合エンドポイントからのリクエストかどうか */
  isUnifiedEndpoint: boolean;
  /** 統合MCPサーバーID（統合エンドポイントの場合のみ設定） */
  unifiedMcpServerId: string;
};
