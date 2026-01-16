/**
 * 統合MCPエンドポイントルート
 *
 * URL: POST /mcp/unified/:unifiedId
 *
 * 複数のMCPサーバーを単一エンドポイントで公開するルート。
 * JWT認証のみをサポートし、作成者のみがアクセス可能。
 */

import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { unifiedJwtAuthMiddleware } from "../middleware/auth/unifiedJwt.js";
import { mcpRequestLoggingMiddleware } from "../middleware/requestLogging/index.js";
import { mcpUnifiedHandler } from "../handlers/mcpUnifiedHandler.js";

export const mcpUnifiedRoute = new Hono<HonoEnv>();

/**
 * 統合MCPエンドポイント
 *
 * POST /mcp/unified/:unifiedId
 *
 * 認証: JWT認証のみ（作成者限定）
 * 機能: 複数のMCPサーバーからのツールを3階層フォーマットで統合公開
 *
 * 注意:
 * - PIIマスキングとTOON変換は子サーバーの設定を使用
 * - ログは統合サーバーIDと実際のMCPサーバーIDの両方を記録
 */
mcpUnifiedRoute.post(
  "/:unifiedId",
  mcpRequestLoggingMiddleware,
  unifiedJwtAuthMiddleware,
  // PIIマスキングとTOON変換は子サーバーごとに適用するため、
  // ここでは適用しない（toolExecutor内で動的に適用）
  mcpUnifiedHandler,
);
