import type { Context, Next } from "hono";
import { AuthType, PiiMaskingMode, db } from "@tumiki/db/server";
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
  validateOrganizationMembership,
} from "../../libs/auth/index.js";
import { getMcpServerOrganization } from "../../services/mcpServerService.js";

import type { McpServerLookupResult } from "../../services/mcpServerService.js";

/**
 * 統合MCPサーバー情報
 */
type UnifiedMcpServerInfo = {
  id: string;
  name: string;
  organizationId: string;
  createdBy: string;
  deletedAt: Date | null;
};

/**
 * サーバー種類判定結果
 */
export type ServerTypeResult =
  | {
      type: "mcp";
      server: McpServerLookupResult;
    }
  | {
      type: "unified";
      server: UnifiedMcpServerInfo;
    }
  | null;

/**
 * サーバー種類を判定
 *
 * serverIdがMcpServerかUnifiedMcpServerかをDB検索で自動判定
 *
 * @param serverId - サーバーID
 * @returns サーバー種類と情報、または見つからない場合はnull
 */
export const detectServerType = async (
  serverId: string,
): Promise<ServerTypeResult> => {
  // まずMcpServerを検索
  const mcpServer = await getMcpServerOrganization(serverId);
  if (mcpServer) {
    return {
      type: "mcp",
      server: mcpServer,
    };
  }

  // 見つからなければUnifiedMcpServerを検索
  const unifiedServer = await db.unifiedMcpServer.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      createdBy: true,
      deletedAt: true,
    },
  });

  if (unifiedServer) {
    return {
      type: "unified",
      server: unifiedServer,
    };
  }

  return null;
};

/**
 * 認証方式を判定
 *
 * @returns AuthType | null
 */
const detectAuthType = (c: Context<HonoEnv>): AuthType | null => {
  const authorization = c.req.header(AUTH_CONFIG.HEADERS.AUTHORIZATION);
  const xApiKey = c.req.header(AUTH_CONFIG.HEADERS.API_KEY);

  if (authorization?.startsWith(AUTH_CONFIG.PATTERNS.JWT_PREFIX)) {
    return AuthType.OAUTH; // JWT形式（base64エンコードされたJSON）
  }

  if (
    authorization?.startsWith(AUTH_CONFIG.PATTERNS.API_KEY_PREFIX) ||
    xApiKey
  ) {
    return AuthType.API_KEY; // Tumiki APIキー
  }

  return null;
};

/**
 * 認証ミドルウェア
 *
 * Authorization ヘッダーの形式を判定して、適切な認証方法を選択:
 * - `Bearer eyJ...` → OAuth/JWT 認証（Keycloak）
 * - `Bearer tumiki_...` → API Key 認証
 * - `Tumiki-API-Key` ヘッダー → API Key 認証
 * - なし → 401 エラー
 *
 * JWT認証の場合:
 * - serverIdの種類（McpServer or UnifiedMcpServer）を自動判定
 * - 統合サーバーの場合は作成者チェックを追加
 *
 * 各認証メソッドでリクエストパスのserverIdと認証情報のserverIdが一致するかを検証します。
 */
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authType = detectAuthType(c);

  // JWT認証
  if (authType === AuthType.OAUTH) {
    logInfo("Using JWT authentication");
    return jwtAuthWithServerTypeDetection(c, next);
  }

  // API Key認証
  if (authType === AuthType.API_KEY) {
    logInfo("Using API Key authentication");
    return apiKeyAuthMiddleware(c, next);
  }

  // 認証情報なし
  return c.json(
    createUnauthorizedError("Authentication required", {
      hint: "Provide JWT token (Bearer eyJ...) or API key (Bearer tumiki_... or Tumiki-API-Key header)",
    }),
    401,
  );
};

/**
 * JWT 認証ミドルウェア（サーバー種類自動判定版）
 *
 * 以下の検証を順次実行:
 * 1. JWT認証（トークン抽出、検証、ユーザーID解決）
 * 2. リクエストパスの serverId の確認
 * 3. serverId の種類を判定（McpServer or UnifiedMcpServer）
 * 4. 種類に応じた認可ロジックを実行
 */
const jwtAuthWithServerTypeDetection = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // Step 1: JWT認証（トークン抽出、検証、ユーザーID解決）
  const authResult = await authenticateWithJwt(c);

  if (!authResult.success) {
    // エラータイプに応じたレスポンスを返す
    switch (authResult.error) {
      case "no_bearer_token":
        return c.json(
          createUnauthorizedError(
            "Bearer token required in Authorization header",
          ),
          401,
        );
      case "token_expired":
        return c.json(createUnauthorizedError("Token has expired"), 401);
      case "invalid_signature":
        return c.json(createUnauthorizedError("Invalid token signature"), 401);
      case "invalid_token":
        return c.json(createUnauthorizedError("Invalid access token"), 401);
      case "user_not_found":
        return c.json(
          createUnauthorizedError("User not found for Keycloak ID"),
          401,
        );
      case "resolution_failed":
        return c.json(
          createUnauthorizedError("Failed to verify user identity"),
          401,
        );
    }
  }

  const { payload: jwtPayload, userId } = authResult;

  // JWT ペイロードをコンテキストに設定
  c.set("jwtPayload", jwtPayload);

  // Step 2: serverId の確認
  const serverId = c.req.param("serverId");

  if (!serverId) {
    return c.json(
      createPermissionDeniedError("serverId is required in path"),
      403,
    );
  }

  // Step 3: サーバー種類を判定
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

  // Step 4: 種類に応じた認可ロジック
  if (serverTypeResult.type === "mcp") {
    return handleMcpServerAuth(c, next, serverTypeResult.server, userId);
  } else {
    return handleUnifiedServerAuth(c, next, serverTypeResult.server, userId);
  }
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
  // 論理削除チェック
  if (server.deletedAt) {
    return c.json(
      createNotFoundError(`MCP Server has been deleted: ${server.id}`),
      404,
    );
  }

  // 組織メンバーシップチェック
  const membershipResult = await validateOrganizationMembership(
    server.organizationId,
    userId,
  );

  if (!membershipResult.isMember) {
    if (membershipResult.error === "check_failed") {
      return c.json(
        createPermissionDeniedError("Membership check failed"),
        403,
      );
    }
    return c.json(
      createPermissionDeniedError("User is not a member of this organization"),
      403,
    );
  }

  // 認証成功: コンテキストに認証情報を設定
  c.set("authMethod", AuthType.OAUTH);
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: server.organizationId,
    userId: userId,
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
  // 論理削除チェック
  if (server.deletedAt) {
    return c.json(
      createNotFoundError(`Unified MCP Server has been deleted: ${server.id}`),
      404,
    );
  }

  // 組織メンバーシップチェック
  const membershipResult = await validateOrganizationMembership(
    server.organizationId,
    userId,
  );

  if (!membershipResult.isMember) {
    if (membershipResult.error === "check_failed") {
      return c.json(
        createPermissionDeniedError("Membership check failed"),
        403,
      );
    }
    return c.json(
      createPermissionDeniedError("User is not a member of this organization"),
      403,
    );
  }

  // 認証成功: コンテキストに認証情報を設定
  // 統合エンドポイントではPII/TOON設定は子サーバーごとに適用するため
  // ここではデフォルト値（DISABLED）を設定
  c.set("authMethod", AuthType.OAUTH);
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: server.organizationId,
    userId: userId,
    mcpServerId: "", // 統合エンドポイントではtools/call時に動的に設定
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
    isUnifiedEndpoint: true,
    unifiedMcpServerId: server.id,
  });

  await next();
};
