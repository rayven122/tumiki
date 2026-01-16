/**
 * MCPエンドポイントルート
 *
 * URL: POST /mcp/:serverId
 *
 * 通常MCPサーバーと統合MCPサーバーの両方に対応する統一エンドポイント。
 * serverIdの種類（McpServer or UnifiedMcpServer）を自動判定して適切な処理を行う。
 *
 * 認証:
 * - JWT認証: 両方のサーバータイプに対応
 * - API Key認証: 通常MCPサーバーのみ対応
 *
 * 統合サーバーの場合:
 * - 作成者のみアクセス可能
 * - PIIマスキングとTOON変換は子サーバーの設定を使用
 */

import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { authMiddleware } from "../middleware/auth/index.js";
import { piiMaskingMiddleware } from "../middleware/piiMasking/index.js";
import { toonConversionMiddleware } from "../middleware/toonConversion/index.js";
import { mcpRequestLoggingMiddleware } from "../middleware/requestLogging/index.js";
import { mcpHandler } from "../handlers/mcpHandler.js";

export const mcpRoute = new Hono<HonoEnv>();

/**
 * 条件付きPIIマスキングミドルウェア
 *
 * 統合エンドポイントの場合はスキップ（子サーバーごとに適用するため）
 */
const conditionalPiiMaskingMiddleware: typeof piiMaskingMiddleware = async (
  c,
  next,
) => {
  const authContext = c.get("authContext");

  // 統合エンドポイントの場合はスキップ
  if (authContext?.isUnifiedEndpoint) {
    await next();
    return;
  }

  // 通常エンドポイントの場合はPIIマスキングを適用
  return piiMaskingMiddleware(c, next);
};

/**
 * 条件付きTOON変換ミドルウェア
 *
 * 統合エンドポイントの場合はスキップ（子サーバーごとに適用するため）
 */
const conditionalToonMiddleware: typeof toonConversionMiddleware = async (
  c,
  next,
) => {
  const authContext = c.get("authContext");

  // 統合エンドポイントの場合はスキップ
  if (authContext?.isUnifiedEndpoint) {
    await next();
    return;
  }

  // 通常エンドポイントの場合はTOON変換を適用
  return toonConversionMiddleware(c, next);
};

/**
 * 統一MCPエンドポイント
 *
 * POST /mcp/:serverId
 *
 * パラメータ:
 * - serverId: McpServer.id または UnifiedMcpServer.id
 *
 * 認証:
 * - JWT認証: McpServer（組織メンバー）または UnifiedMcpServer（作成者のみ）
 * - API Key認証: McpServerのみ
 *
 * ミドルウェア処理順:
 * 1. mcpRequestLoggingMiddleware: リクエストロギング
 * 2. authMiddleware: 認証・認可（サーバー種類自動判定）
 * 3. conditionalPiiMaskingMiddleware: PIIマスキング（統合エンドポイントはスキップ）
 * 4. conditionalToonMiddleware: TOON変換（統合エンドポイントはスキップ）
 * 5. mcpHandler: MCP処理（サーバー種類に応じて分岐）
 */
mcpRoute.post(
  "/mcp/:serverId",
  mcpRequestLoggingMiddleware,
  authMiddleware,
  conditionalPiiMaskingMiddleware,
  conditionalToonMiddleware,
  mcpHandler,
);
