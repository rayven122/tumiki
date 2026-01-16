/**
 * 統合MCPエンドポイント用JWT認証ミドルウェアのテスト
 */

/* eslint-disable @typescript-eslint/unbound-method */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../../types/index.js";

// DBをモック
vi.mock("@tumiki/db/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...mod,
    db: {
      unifiedMcpServer: {
        findUnique: vi.fn(),
      },
    },
  };
});

// JWT検証をモック
vi.mock("../../../libs/auth/jwt-verifier.js", () => ({
  verifyKeycloakJWT: vi.fn(),
}));

// サービスをモック
vi.mock("../../../services/mcpServerService.js", () => ({
  checkOrganizationMembership: vi.fn(),
  getUserIdFromKeycloakId: vi.fn(),
}));

// loggerをモック
vi.mock("../../../libs/logger/index.js", () => ({
  logError: vi.fn(),
}));

import { db, AuthType, PiiMaskingMode } from "@tumiki/db/server";
import { verifyKeycloakJWT } from "../../../libs/auth/jwt-verifier.js";
import {
  checkOrganizationMembership,
  getUserIdFromKeycloakId,
} from "../../../services/mcpServerService.js";
import { unifiedJwtAuthMiddleware } from "../unifiedJwt.js";

describe("unifiedJwtAuthMiddleware", () => {
  const mockUnifiedId = "unified-123";
  const mockOrganizationId = "org-456";
  const mockUserId = "user-789";
  const mockKeycloakId = "keycloak-abc";
  const mockAccessToken = "valid-jwt-token";

  const mockUnifiedServer = {
    id: mockUnifiedId,
    name: "Test Unified Server",
    organizationId: mockOrganizationId,
    createdBy: mockUserId,
    deletedAt: null,
  };

  const mockJwtPayload = {
    sub: mockKeycloakId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    iss: "https://keycloak.example.com",
  };

  // テスト用Honoアプリを作成
  const createTestApp = () => {
    const app = new Hono<HonoEnv>();
    app.post("/mcp/unified/:unifiedId", unifiedJwtAuthMiddleware, async (c) => {
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

  test("正常な認証フローが成功する", async () => {
    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      authContext: {
        authMethod: string;
        organizationId: string;
        userId: string;
        isUnifiedEndpoint: boolean;
        unifiedMcpServerId: string;
      };
    };
    expect(body.success).toBe(true);
    expect(body.authContext.authMethod).toBe(AuthType.OAUTH);
    expect(body.authContext.organizationId).toBe(mockOrganizationId);
    expect(body.authContext.userId).toBe(mockUserId);
    expect(body.authContext.isUnifiedEndpoint).toBe(true);
    expect(body.authContext.unifiedMcpServerId).toBe(mockUnifiedId);
  });

  test("Authorizationヘッダーがない場合は401エラーを返す", async () => {
    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe(
      "Bearer token required in Authorization header",
    );
  });

  test("Bearerプレフィックスがない場合は401エラーを返す", async () => {
    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: "Basic some-token",
      },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe(
      "Bearer token required in Authorization header",
    );
  });

  test("期限切れJWTの場合は401エラーを返す", async () => {
    vi.mocked(verifyKeycloakJWT).mockRejectedValue(new Error("Token expired"));

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
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
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Invalid token signature");
  });

  test("その他のJWT検証エラーの場合は401エラーを返す", async () => {
    vi.mocked(verifyKeycloakJWT).mockRejectedValue(new Error("Unknown error"));

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Invalid access token");
  });

  test("統合MCPサーバーが見つからない場合は404エラーを返す", async () => {
    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(null);

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe(
      `Unified MCP Server not found: ${mockUnifiedId}`,
    );
  });

  test("論理削除された統合MCPサーバーの場合は404エラーを返す", async () => {
    const deletedServer = {
      ...mockUnifiedServer,
      deletedAt: new Date("2024-01-01"),
    };

    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      deletedServer as never,
    );

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe(
      `Unified MCP Server has been deleted: ${mockUnifiedId}`,
    );
  });

  test("Keycloakユーザーが見つからない場合は401エラーを返す", async () => {
    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(null);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("User not found for Keycloak ID");
  });

  test("作成者でないユーザーの場合は403エラーを返す", async () => {
    const differentUserId = "different-user-id";

    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(differentUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe(
      "Only the creator can access this unified MCP server",
    );
  });

  test("組織メンバーでないユーザーの場合は403エラーを返す", async () => {
    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(checkOrganizationMembership).mockResolvedValue(false);

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
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

  test("組織メンバーシップチェックでエラーが発生した場合は403エラーを返す", async () => {
    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(checkOrganizationMembership).mockRejectedValue(
      new Error("Database error"),
    );

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Membership check failed");
  });

  test("認証成功時にPII/TOON設定がデフォルト値に設定される", async () => {
    vi.mocked(verifyKeycloakJWT).mockResolvedValue(mockJwtPayload);
    vi.mocked(getUserIdFromKeycloakId).mockResolvedValue(mockUserId);
    vi.mocked(db.unifiedMcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(checkOrganizationMembership).mockResolvedValue(true);

    const app = createTestApp();
    const res = await app.request(`/mcp/unified/${mockUnifiedId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockAccessToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      authContext: {
        piiMaskingMode: string;
        piiInfoTypes: string[];
        toonConversionEnabled: boolean;
        mcpServerId: string;
      };
    };
    expect(body.authContext.piiMaskingMode).toBe(PiiMaskingMode.DISABLED);
    expect(body.authContext.piiInfoTypes).toStrictEqual([]);
    expect(body.authContext.toonConversionEnabled).toBe(false);
    expect(body.authContext.mcpServerId).toBe("");
  });
});
