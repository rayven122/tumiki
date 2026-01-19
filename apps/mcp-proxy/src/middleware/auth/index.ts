/**
 * 認証ミドルウェア
 *
 * Authorization ヘッダーの形式を判定して、適切な認証方法を選択
 */

import type { Context, Next } from "hono";
import { AuthType, PiiMaskingMode, ServerType } from "@tumiki/db/server";
import type { HonoEnv } from "../../types/index.js";
import { logInfo, logError } from "../../libs/logger/index.js";
import { AUTH_CONFIG } from "../../constants/config.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
  createNotFoundError,
} from "../../libs/error/index.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";
import {
  authenticateWithJwt,
  getJwtErrorMessage,
  validateOrganizationMembership,
} from "../../libs/auth/index.js";
import { getMcpServerOrganization } from "../../services/mcpServerService.js";
import type { McpServerLookupResult } from "../../services/mcpServerService.js";

/** 統合MCPサーバー情報 */
type UnifiedMcpServerInfo = {
  id: string;
  name: string;
  organizationId: string;
  deletedAt: Date | null;
};

/** サーバー種類判定結果 */
export type ServerTypeResult =
  | { type: "mcp"; server: McpServerLookupResult }
  | { type: "unified"; server: UnifiedMcpServerInfo }
  | null;

/**
 * サーバー種類を判定
 *
 * serverIdがMcpServer（通常 or UNIFIED）かをDB検索で自動判定
 */
export const detectServerType = async (
  serverId: string,
): Promise<ServerTypeResult> => {
  const mcpServer = await getMcpServerOrganization(serverId);

  if (!mcpServer) {
    return null;
  }

  // serverType=CUSTOMの場合は統合サーバーとして扱う
  if (mcpServer.serverType === ServerType.CUSTOM) {
    return {
      type: "unified",
      server: {
        id: mcpServer.id,
        name: mcpServer.name,
        organizationId: mcpServer.organizationId,
        deletedAt: mcpServer.deletedAt,
      },
    };
  }

  return { type: "mcp", server: mcpServer };
};

/**
 * 認証方式を判定
 */
const detectAuthType = (c: Context<HonoEnv>): AuthType | null => {
  const authorization = c.req.header(AUTH_CONFIG.HEADERS.AUTHORIZATION);
  const xApiKey = c.req.header(AUTH_CONFIG.HEADERS.API_KEY);

  if (authorization?.startsWith(AUTH_CONFIG.PATTERNS.JWT_PREFIX)) {
    return AuthType.OAUTH;
  }

  if (
    authorization?.startsWith(AUTH_CONFIG.PATTERNS.API_KEY_PREFIX) ||
    xApiKey
  ) {
    return AuthType.API_KEY;
  }

  return null;
};

/**
 * 組織メンバーシップエラーのレスポンスを生成
 */
const createMembershipErrorResponse = (
  c: Context<HonoEnv>,
  error: "check_failed" | "not_a_member",
): Response => {
  const message =
    error === "check_failed"
      ? "Membership check failed"
      : "User is not a member of this organization";
  return c.json(createPermissionDeniedError(message), 403);
};

/**
 * 認証ミドルウェア
 *
 * Authorization ヘッダーの形式を判定して、適切な認証方法を選択:
 * - `Bearer eyJ...` → OAuth/JWT 認証（Keycloak）
 * - `Bearer tumiki_...` → API Key 認証
 * - `Tumiki-API-Key` ヘッダー → API Key 認証
 * - なし → 401 エラー
 */
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authType = detectAuthType(c);

  if (authType === AuthType.OAUTH) {
    logInfo("Using JWT authentication");
    return jwtAuthWithServerTypeDetection(c, next);
  }

  if (authType === AuthType.API_KEY) {
    logInfo("Using API Key authentication");
    return apiKeyAuthMiddleware(c, next);
  }

  return c.json(
    createUnauthorizedError("Authentication required", {
      hint: "Provide JWT token (Bearer eyJ...) or API key (Bearer tumiki_... or Tumiki-API-Key header)",
    }),
    401,
  );
};

/**
 * JWT 認証ミドルウェア（サーバー種類自動判定版）
 */
const jwtAuthWithServerTypeDetection = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // JWT認証（トークン抽出、検証、ユーザーID解決）
  const authResult = await authenticateWithJwt(c);

  if (!authResult.success) {
    return c.json(
      createUnauthorizedError(getJwtErrorMessage(authResult.error)),
      401,
    );
  }

  const { payload: jwtPayload, userId } = authResult;
  c.set("jwtPayload", jwtPayload);

  // serverId の確認
  const serverId = c.req.param("serverId");
  if (!serverId) {
    return c.json(
      createPermissionDeniedError("serverId is required in path"),
      403,
    );
  }

  // サーバー種類を判定
  let serverTypeResult: ServerTypeResult;
  try {
    serverTypeResult = await detectServerType(serverId);
  } catch (error) {
    logError("Failed to detect server type", error as Error, { serverId });
    return c.json(
      createPermissionDeniedError("Failed to verify server access"),
      403,
    );
  }

  if (!serverTypeResult) {
    return c.json(createNotFoundError(`Server not found: ${serverId}`), 404);
  }

  // 種類に応じた認可ロジック
  if (serverTypeResult.type === "mcp") {
    return handleMcpServerAuth(c, next, serverTypeResult.server, userId);
  }
  return handleUnifiedServerAuth(c, next, serverTypeResult.server, userId);
};

/**
 * 通常MCPサーバーの認証処理
 */
const handleMcpServerAuth = async (
  c: Context<HonoEnv>,
  next: Next,
  server: McpServerLookupResult,
  userId: string,
): Promise<Response | void> => {
  if (server.deletedAt) {
    return c.json(
      createNotFoundError(`MCP Server has been deleted: ${server.id}`),
      404,
    );
  }

  const membershipResult = await validateOrganizationMembership(
    server.organizationId,
    userId,
  );

  if (!membershipResult.isMember) {
    return createMembershipErrorResponse(c, membershipResult.error);
  }

  c.set("authMethod", AuthType.OAUTH);
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: server.organizationId,
    userId,
    mcpServerId: server.id,
    piiMaskingMode: server.piiMaskingMode,
    piiInfoTypes: server.piiInfoTypes,
    toonConversionEnabled: server.toonConversionEnabled,
    isUnifiedEndpoint: false,
  });

  await next();
};

/**
 * 統合MCPサーバーの認証処理
 *
 * 組織メンバーシップのみをチェック（ツール利用は組織メンバー全員に開放）
 */
const handleUnifiedServerAuth = async (
  c: Context<HonoEnv>,
  next: Next,
  server: UnifiedMcpServerInfo,
  userId: string,
): Promise<Response | void> => {
  if (server.deletedAt) {
    return c.json(
      createNotFoundError(`Unified MCP Server has been deleted: ${server.id}`),
      404,
    );
  }

  const membershipResult = await validateOrganizationMembership(
    server.organizationId,
    userId,
  );

  if (!membershipResult.isMember) {
    return createMembershipErrorResponse(c, membershipResult.error);
  }

  // 統合エンドポイントではPII/TOON設定は子サーバーごとに適用するため
  // ここではデフォルト値（DISABLED）を設定
  c.set("authMethod", AuthType.OAUTH);
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: server.organizationId,
    userId,
    mcpServerId: "", // 統合エンドポイントではtools/call時に動的に設定
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
    isUnifiedEndpoint: true,
    unifiedMcpServerId: server.id,
  });

  await next();
};
