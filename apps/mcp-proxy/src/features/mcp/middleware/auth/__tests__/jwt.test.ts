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
    getMcpServerBySlugOrId: vi.fn(),
    checkOrganizationMembership: vi.fn(),
  }),
);

vi.mock(
  "../../../../../infrastructure/db/repositories/userRepository.js",
  () => ({
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
  getMcpServerBySlugOrId,
  checkOrganizationMembership,
} from "../../../../../infrastructure/db/repositories/mcpServerRepository.js";
import {
  getUserIdFromKeycloakId,
  getUserIdByEmail,
} from "../../../../../infrastructure/db/repositories/userRepository.js";

// モック関数を取得
const mockVerifyKeycloakJWT = vi.mocked(verifyKeycloakJWT);
const mockGetMcpServerBySlugOrId = vi.mocked(getMcpServerBySlugOrId);
const mockCheckOrganizationMembership = vi.mocked(checkOrganizationMembership);
const mockGetUserIdFromKeycloakId = vi.mocked(getUserIdFromKeycloakId);
const mockGetUserIdByEmail = vi.mocked(getUserIdByEmail);

describe("jwtAuthMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();

    // テスト用のHonoアプリを作成（パスパラメータをslugに変更）
    app = new Hono<HonoEnv>();
    app.use("/:slug/*", jwtAuthMiddleware);
    app.get("/:slug/test", (c) => {
      const authContext = c.get("authContext");
      return c.json({ success: true, authContext });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Authorizationヘッダーの検証", () => {
    test("Authorizationヘッダーがない場合は401を返す", async () => {
      const res = await app.request("/my-server/test");

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Bearer token required");
    });

    test("Bearer形式でない場合は401を返す", async () => {
      const res = await app.request("/my-server/test", {
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

      const res = await app.request("/my-server/test", {
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

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer invalid-sig-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("signature");
    });

    test("その他の検証エラーの場合は401を返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(new Error("Unknown JWT error"));

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer bad-token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Invalid access token");
    });
  });

  describe("organizationIdの検証", () => {
    test("JWTにorganizationIdが含まれていない場合は403を返す", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
        // tumiki.org_id が含まれていない
      });

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Organization ID not found in JWT");
    });
  });

  describe("MCP Server検証", () => {
    const validPayload = {
      sub: "keycloak-user-123",
      email: "user@example.com",
      tumiki: {
        org_id: "org-456",
      },
    };

    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue(validPayload);
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
    });

    test("MCP Serverが見つからない場合は404を返す", async () => {
      mockGetMcpServerBySlugOrId.mockResolvedValue(null);

      const res = await app.request("/nonexistent-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("MCP Server not found");
    });

    test("削除済みMCP Serverの場合は404を返す", async () => {
      mockGetMcpServerBySlugOrId.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: new Date(),
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("deleted");
    });

    test("MCP Server取得エラーの場合は403を返す", async () => {
      mockGetMcpServerBySlugOrId.mockRejectedValue(new Error("Database error"));

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain(
        "Failed to verify MCP server access",
      );
    });

    test("slugとorganizationIdでMcpServerを検索する", async () => {
      mockGetMcpServerBySlugOrId.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(200);
      expect(mockGetMcpServerBySlugOrId).toHaveBeenCalledWith(
        "my-server",
        "org-456",
      );
    });
  });

  describe("ユーザー解決", () => {
    const validPayload = {
      sub: "keycloak-user-123",
      email: "user@example.com",
      tumiki: {
        org_id: "org-456",
      },
    };

    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue(validPayload);
    });

    test("Keycloak IDでユーザーを解決する", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockGetMcpServerBySlugOrId.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const res = await app.request("/my-server/test", {
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
      mockGetMcpServerBySlugOrId.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(200);
      expect(mockGetUserIdByEmail).toHaveBeenCalledWith("user@example.com");
    });

    test("どちらでも見つからない場合は401を返す", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);
      mockGetUserIdByEmail.mockResolvedValue(null);

      const res = await app.request("/my-server/test", {
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

      const res = await app.request("/my-server/test", {
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
        tumiki: {
          org_id: "org-456",
        },
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockGetMcpServerBySlugOrId.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      });
    });

    test("メンバーでない場合は403を返す", async () => {
      mockCheckOrganizationMembership.mockResolvedValue(false);

      const res = await app.request("/my-server/test", {
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

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Membership check failed");
    });
  });

  describe("slugが欠落", () => {
    test("slugがパスにない場合は403を返す", async () => {
      // slug パラメータなしのルートを作成
      const appWithoutParam = new Hono<HonoEnv>();
      appWithoutParam.use("/test/*", jwtAuthMiddleware);
      appWithoutParam.get("/test/endpoint", (c) => {
        return c.json({ success: true });
      });

      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
        tumiki: {
          org_id: "org-456",
        },
      });

      const res = await appWithoutParam.request("/test/endpoint", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("slug or ID is required in path");
    });
  });

  describe("認証成功", () => {
    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
        tumiki: {
          org_id: "org-456",
        },
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockGetMcpServerBySlugOrId.mockResolvedValue({
        id: "server-123",
        organizationId: "org-456",
        deletedAt: null,
        authType: "OAUTH",
        piiMaskingMode: "BOTH",
        piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
        toonConversionEnabled: true,
      });
      mockCheckOrganizationMembership.mockResolvedValue(true);
    });

    test("認証成功時にauthContextが設定される", async () => {
      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as SuccessResponse;
      expect(body.authContext).toStrictEqual({
        authMethod: AuthType.OAUTH,
        organizationId: "org-456",
        userId: "tumiki-user-123",
        mcpServerId: "server-123", // 実際のIDがauthContextに設定される
        piiMaskingMode: "BOTH",
        piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
        toonConversionEnabled: true,
      });
    });
  });
});
