import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type {
  HonoEnv,
  AuthContext,
} from "../../../../../shared/types/honoEnv.js";

// レスポンスボディの型定義（JSON-RPC 2.0 エラー形式）
type ErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type SuccessResponse = {
  success: boolean;
  authContext: AuthContext;
};

// jwt-verifier のモック
vi.mock("../../../../../infrastructure/keycloak/jwtVerifierImpl.js", () => ({
  verifyKeycloakJWT: vi.fn(),
}));

// mcpServerService のモック
vi.mock(
  "../../../../../infrastructure/db/repositories/mcpServerRepository.js",
  () => ({
    getMcpServerOrganization: vi.fn(),
    checkOrganizationMembership: vi.fn(),
    getUserIdFromKeycloakId: vi.fn(),
    getUserIdByEmail: vi.fn(),
  }),
);

// logger のモック
vi.mock("../../../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
}));

import { jwtAuthMiddleware } from "../jwtAuth.js";
import { AuthType } from "@tumiki/db";
import { verifyKeycloakJWT } from "../../../../../infrastructure/keycloak/jwtVerifierImpl.js";
import {
  getMcpServerOrganization,
  checkOrganizationMembership,
  getUserIdFromKeycloakId,
  getUserIdByEmail,
} from "../../../../../infrastructure/db/repositories/mcpServerRepository.js";

// モック関数を取得
const mockVerifyKeycloakJWT = vi.mocked(verifyKeycloakJWT);
const mockGetMcpServerOrganization = vi.mocked(getMcpServerOrganization);
const mockCheckOrganizationMembership = vi.mocked(checkOrganizationMembership);
const mockGetUserIdFromKeycloakId = vi.mocked(getUserIdFromKeycloakId);
const mockGetUserIdByEmail = vi.mocked(getUserIdByEmail);

describe("jwtAuthMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();

    // テスト用のHonoアプリを作成
    app = new Hono<HonoEnv>();
    app.use("/:mcpServerId/*", jwtAuthMiddleware);
    app.get("/:mcpServerId/test", (c) => {
      const authContext = c.get("authContext");
      return c.json({ success: true, authContext });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Authorizationヘッダーの検証", () => {
    test("Authorizationヘッダーがない場合は401を返す", async () => {
      const res = await app.request("/server-123/test");

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Bearer token required");
    });

    test("Bearer形式でない場合は401を返す", async () => {
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Bearer token required");
    });
  });

  describe("JWT検証", () => {
    test("期限切れトークンの場合は401を返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(new Error("Token has expired"));

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer expired-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("expired");
    });

    test("不正な署名の場合は401を返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(
        new Error("Invalid signature detected"),
      );

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer invalid-sig-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("signature");
    });

    test("その他の検証エラーの場合は401を返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(new Error("Unknown JWT error"));

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer bad-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Invalid access token");
    });
  });

  describe("MCP Server検証", () => {
    const validPayload = {
      sub: "keycloak-user-123",
      email: "user@example.com",
    };

    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue(validPayload);
    });

    test("MCP Serverが見つからない場合は404を返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue(null);

      const res = await app.request("/nonexistent-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("MCP Server not found");
    });

    test("削除済みMCP Serverの場合は404を返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: new Date(),
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("deleted");
    });

    test("MCP Server取得エラーの場合は403を返す", async () => {
      mockGetMcpServerOrganization.mockRejectedValue(
        new Error("Database error"),
      );

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain(
        "Failed to verify MCP server access",
      );
    });
  });

  describe("ユーザー解決", () => {
    const validPayload = {
      sub: "keycloak-user-123",
      email: "user@example.com",
    };

    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue(validPayload);
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });
    });

    test("Keycloak IDでユーザーを解決する", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(200);
      expect(mockGetUserIdFromKeycloakId).toHaveBeenCalledWith(
        "keycloak-user-123",
      );
      expect(mockGetUserIdByEmail).not.toHaveBeenCalled();
    });

    test("Keycloak IDで見つからない場合はemailでフォールバック", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);
      mockGetUserIdByEmail.mockResolvedValue("tumiki-user-by-email");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(200);
      expect(mockGetUserIdByEmail).toHaveBeenCalledWith("user@example.com");
    });

    test("どちらでも見つからない場合は401を返す", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);
      mockGetUserIdByEmail.mockResolvedValue(null);

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("User not found");
    });

    test("ユーザー解決エラーの場合は401を返す", async () => {
      mockGetUserIdFromKeycloakId.mockRejectedValue(
        new Error("User lookup failed"),
      );

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Failed to verify user identity");
    });
  });

  describe("組織メンバーシップ検証", () => {
    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
      });
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
    });

    test("メンバーでない場合は403を返す", async () => {
      mockCheckOrganizationMembership.mockResolvedValue(false);

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("not a member");
    });

    test("メンバーシップチェックエラーの場合は403を返す", async () => {
      mockCheckOrganizationMembership.mockRejectedValue(
        new Error("Membership check failed"),
      );

      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Membership check failed");
    });
  });

  describe("mcpServerIdが欠落", () => {
    test("mcpServerIdがパスにない場合は403を返す", async () => {
      // mcpServerId パラメータなしのルートを作成
      const appWithoutParam = new Hono<HonoEnv>();
      appWithoutParam.use("/test/*", jwtAuthMiddleware);
      appWithoutParam.get("/test/endpoint", (c) => {
        return c.json({ success: true });
      });

      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
      });

      const res = await appWithoutParam.request("/test/endpoint", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("mcpServerId is required in path");
    });
  });

  describe("認証成功", () => {
    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
      });
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "BOTH",
        piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
        toonConversionEnabled: true,
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockCheckOrganizationMembership.mockResolvedValue(true);
    });

    test("認証成功時にauthContextが設定される", async () => {
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as SuccessResponse;
      expect(body.authContext).toStrictEqual({
        authMethod: AuthType.OAUTH,
        organizationId: "org-456",
        userId: "tumiki-user-123",
        mcpServerId: "server-123",
        piiMaskingMode: "BOTH",
        piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
        toonConversionEnabled: true,
      });
    });
  });
});
