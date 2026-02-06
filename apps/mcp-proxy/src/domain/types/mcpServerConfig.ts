import type { AuthType, PiiMaskingMode } from "./authContext.js";

/**
 * MCPサーバー検索結果の型（読み取りモデル）
 */
type McpServerLookupResult = {
  id: string;
  organizationId: string;
  deletedAt: Date | null;
  authType: AuthType;
  piiMaskingMode: PiiMaskingMode;
  piiInfoTypes: string[];
  toonConversionEnabled: boolean;
};

/**
 * テンプレートインスタンス検索結果の型
 */
type TemplateInstanceLookupResult = {
  id: string;
  mcpServerId: string;
};

export type { McpServerLookupResult, TemplateInstanceLookupResult };
