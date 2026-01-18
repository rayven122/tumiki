/**
 * 統合認証ミドルウェアのテスト
 *
 * - 認証方式の判定（JWT, API Key）
 * - サーバー種類の自動判定（McpServer, UnifiedMcpServer）
 * - JWT認証フロー
 * - 作成者チェック（統合サーバーの場合）
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { AuthType, PiiMaskingMode, ServerType } from "@tumiki/db";
import type { HonoEnv, AuthContext } from "../../types/index.js";
import type { McpServerLookupResult } from "../../services/mcpServerService.js";

// JWT検証をモック
vi.mock("../../libs/auth/jwt-verifier.js", () => ({
  verifyKeycloakJWT: vi.fn(),
}));

// サービスをモック
vi.mock("../../services/mcpServerService.js", () => ({
  getMcpServerOrganization: vi.fn(),
  checkOrganizationMembership: vi.fn(),
  getUserIdFromKeycloakId: vi.fn(),
}));

// loggerをモック
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// apiKeyAuthMiddlewareをモック
vi.mock("./apiKey.js", () => ({
  apiKeyAuthMiddleware: vi.fn(
    async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  ),
}));

import { verifyKeycloakJWT } from "../../libs/auth/jwt-verifier.js";
import {
  getMcpServerOrganization,
  checkOrganizationMembership,
  getUserIdFromKeycloakId,
} from "../../services/mcpServerService.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";
import { authMiddleware, detectServerType } from "./index.js";

describe("authMiddleware", () => {
  const mockServerId = "server-123";
  const mockOrganizationId = "org-456";
  const mockUserId = "user-789";
  const mockKeycloakId = "keycloak-abc";
  const mockAccessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test";

  const mockJwtPayload = {
    sub: mockKeycloakId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    iss: "https://keycloak.example.com",
  };

  const mockMcpServer: McpServerLookupResult = {
    id: mockServerId,
    name: "Test MCP Server",
    organizationId: mockOrganizationId,
    authType: "OAUTH",
    serverType: "CUSTOM",
    createdBy: null,
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
    deletedAt: null,
  };

  // 統合MCPサーバー用モック（serverType=UNIFIED）
  const mockUnifiedServer: McpServerLookupResult = {
    id: mockServerId,
    name: "Test Unified Server",
    organizationId: mockOrganizationId,
    authType: "OAUTH",
    serverType: ServerType.UNIFIED,
    createdBy: mockUserId,
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
    deletedAt: null,
  };

  // テスト用Honoアプリを作成
  const createTestApp = () => {
    const app = new Hono<HonoEnv>();
    app.post("/mcp/:serverId", authMiddleware, async (c) => {
      const authContext = c.get("authContext");
      return c.json({ success: true, authContext });
    });
    return app;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("認証方式の判定", () => {
    test("JWT認証を正しく検出する（Bearer eyJ...）", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockMcpServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(verifyKeycloakJWT).toHaveBeenCalledWith(mockAccessToken);
    });

    test("APIキー認証を正しく検出する（Bearer tumiki_...）", async () => {
      const app = createTestApp();
      await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: "Bearer tumiki_test_key",
        },
      });

      expect(apiKeyAuthMiddleware).toHaveBeenCalled();
    });

    test("APIキー認証を正しく検出する（Tumiki-API-Key）", async () => {
      const app = createTestApp();
      await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          "Tumiki-API-Key": "tumiki_test_key",
        },
      });

      expect(apiKeyAuthMiddleware).toHaveBeenCalled();
    });

    test("認証情報がない場合は401エラーを返す", async () => {
      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe("Authentication required");
    });
  });

  describe("JWT認証 - 通常MCPサーバー", () => {
    test("有効なJWTトークンで認証成功", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockMcpServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        authContext: AuthContext;
      };
      expect(body.success).toBe(true);
      expect(body.authContext.authMethod).toBe(AuthType.OAUTH);
      expect(body.authContext.organizationId).toBe(mockOrganizationId);
      expect(body.authContext.userId).toBe(mockUserId);
      expect(body.authContext.mcpServerId).toBe(mockServerId);
      expect(body.authContext.isUnifiedEndpoint).toBe(false);
    });

    test("期限切れJWTの場合は401エラーを返す", async () => {
      vi.mocked(verifyKeycloakJWT).mockRejectedValue(
        new Error("Token expired"),
      );

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe("Token has expired");
    });

    test("無効な署名の場合は401エラーを返す", async () => {
      vi.mocked(verifyKeycloakJWT).mockRejectedValue(
        new Error("Invalid signature"),
      );

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe("Invalid token signature");
    });

    test("Keycloakユーザーが見つからない場合は401エラーを返す", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe("User not found for Keycloak ID");
    });

    test("サーバーが見つからない場合は404エラーを返す", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe(`Server not found: ${mockServerId}`);
    });

    test("削除されたMCPサーバーの場合は404エラーを返す", async () => {
      const deletedServer: McpServerLookupResult = {
        ...mockMcpServer,
        deletedAt: new Date("2024-01-01"),
      };
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(deletedServer);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe(
        `MCP Server has been deleted: ${mockServerId}`,
      );
    });

    test("組織メンバーでないユーザーの場合は403エラーを返す", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockMcpServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(false);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe(
        "User is not a member of this organization",
      );
    });
  });

  describe("JWT認証 - 統合MCPサーバー", () => {
    test("作成者による正常な認証フローが成功する", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      // 統合サーバーはMcpServerテーブルにserverType=UNIFIEDで格納されている
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockUnifiedServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        authContext: AuthContext;
      };
      expect(body.success).toBe(true);
      expect(body.authContext.authMethod).toBe(AuthType.OAUTH);
      expect(body.authContext.organizationId).toBe(mockOrganizationId);
      expect(body.authContext.userId).toBe(mockUserId);
      expect(body.authContext.isUnifiedEndpoint).toBe(true);
      expect(body.authContext.unifiedMcpServerId).toBe(mockServerId);
    });

    test("同一組織の別ユーザーでもアクセスできる", async () => {
      const differentUserId = "different-user-id";

      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(differentUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockUnifiedServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        authContext: AuthContext;
      };
      expect(body.success).toBe(true);
      expect(body.authContext.userId).toBe(differentUserId);
      expect(body.authContext.isUnifiedEndpoint).toBe(true);
    });

    test("組織外ユーザーの場合は403エラーを返す", async () => {
      const outsideUserId = "outside-user-id";

      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(outsideUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockUnifiedServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(false);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe(
        "User is not a member of this organization",
      );
    });

    test("削除された統合MCPサーバーの場合は404エラーを返す", async () => {
      const deletedServer: McpServerLookupResult = {
        ...mockUnifiedServer,
        deletedAt: new Date("2024-01-01"),
      };

      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(deletedServer);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe(
        `Unified MCP Server has been deleted: ${mockServerId}`,
      );
    });

    test("統合サーバー認証時にPII/TOON設定がデフォルト値に設定される", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockUnifiedServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        authContext: AuthContext;
      };
      expect(body.authContext.piiMaskingMode).toBe(PiiMaskingMode.DISABLED);
      expect(body.authContext.piiInfoTypes).toStrictEqual([]);
      expect(body.authContext.toonConversionEnabled).toBe(false);
      expect(body.authContext.mcpServerId).toBe("");
    });

    test("組織メンバーでないユーザーの場合は403エラーを返す", async () => {
      vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
      vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
      vi.mocked(getMcpServerOrganization).mockResolvedValue(mockUnifiedServer);
      vi.mocked(checkOrganizationMembership).mockResolvedValue(false);

      const app = createTestApp();
      const res = await app.request(`/mcp/${mockServerId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe(
        "User is not a member of this organization",
      );
    });
  });
});

describe("detectServerType", () => {
  const mockServerId = "server-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("McpServer (serverType=CUSTOM) が見つかった場合はmcpタイプを返す", async () => {
    const mockMcpServer: McpServerLookupResult = {
      id: mockServerId,
      name: "Test MCP Server",
      organizationId: "org-123",
      authType: "OAUTH",
      serverType: "CUSTOM",
      createdBy: null,
      piiMaskingMode: PiiMaskingMode.DISABLED,
      piiInfoTypes: [],
      toonConversionEnabled: false,
      deletedAt: null,
    };
    vi.mocked(getMcpServerOrganization).mockResolvedValue(mockMcpServer);

    const result = await detectServerType(mockServerId);

    expect(result).toStrictEqual({
      type: "mcp",
      server: mockMcpServer,
    });
  });

  test("McpServer (serverType=UNIFIED) が見つかった場合はunifiedタイプを返す", async () => {
    const mockUnifiedServer: McpServerLookupResult = {
      id: mockServerId,
      name: "Test Unified",
      organizationId: "org-123",
      authType: "OAUTH",
      serverType: ServerType.UNIFIED,
      createdBy: "user-123",
      piiMaskingMode: PiiMaskingMode.DISABLED,
      piiInfoTypes: [],
      toonConversionEnabled: false,
      deletedAt: null,
    };
    vi.mocked(getMcpServerOrganization).mockResolvedValue(mockUnifiedServer);

    const result = await detectServerType(mockServerId);

    // unified タイプの場合は必要なフィールドのみ返す
    expect(result).toStrictEqual({
      type: "unified",
      server: {
        id: mockServerId,
        name: "Test Unified",
        organizationId: "org-123",
        createdBy: "user-123",
        deletedAt: null,
      },
    });
  });

  test("サーバーが見つからない場合はnullを返す", async () => {
    vi.mocked(getMcpServerOrganization).mockResolvedValue(null);

    const result = await detectServerType(mockServerId);

    expect(result).toBeNull();
  });
});
