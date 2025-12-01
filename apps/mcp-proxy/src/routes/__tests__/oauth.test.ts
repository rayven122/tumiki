import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { oauthTokenHandler } from "../oauth.js";
import { clearKeycloakCache } from "../../libs/auth/keycloak.js";

// vi.hoisted でモック関数を定義（ホイスティング問題を回避）
const { mockDiscover, mockGrant, mockRefresh, MockClient } = vi.hoisted(() => {
  const grant = vi.fn();
  const refresh = vi.fn();
  const Client = vi.fn().mockImplementation(() => ({
    grant,
    refresh,
  }));
  return {
    mockDiscover: vi.fn(),
    mockGrant: grant,
    mockRefresh: refresh,
    MockClient: Client,
  };
});

// モックの設定
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

// openid-client のモック（Issuer と Client）
vi.mock("openid-client", () => {
  return {
    Issuer: {
      discover: mockDiscover,
    },
    errors: {
      OPError: class OPError extends Error {
        error: string;
        error_description?: string;
        constructor(options: { error: string; error_description?: string }) {
          super(options.error_description ?? options.error);
          this.error = options.error;
          this.error_description = options.error_description;
        }
      },
      RPError: class RPError extends Error {},
    },
  };
});

// デフォルトの Issuer モック値を作成するヘルパー
const createMockIssuer = () => ({
  issuer: "https://keycloak.example.com/realms/tumiki",
  metadata: {
    issuer: "https://keycloak.example.com/realms/tumiki",
    token_endpoint:
      "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
    jwks_uri:
      "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
  },
  Client: MockClient,
});

describe("oauthTokenHandler", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.post("/oauth/token", oauthTokenHandler);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";

    // キャッシュをクリア
    clearKeycloakCache();

    vi.clearAllMocks();

    // MockClient の実装を再設定
    MockClient.mockImplementation(() => ({
      grant: mockGrant,
      refresh: mockRefresh,
    }));

    // デフォルトの Issuer モックを設定
    mockDiscover.mockResolvedValue(createMockIssuer());
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalKeycloakIssuer !== undefined) {
      process.env.KEYCLOAK_ISSUER = originalKeycloakIssuer;
    } else {
      delete process.env.KEYCLOAK_ISSUER;
    }

    // キャッシュをクリア
    clearKeycloakCache();
  });

  describe("バリデーション", () => {
    test("Content-Typeが不正な場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: "test-client",
          client_secret: "test-secret",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "Content-Type must be application/x-www-form-urlencoded",
      });
    });

    test("grant_typeが不正な場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "password");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "unsupported_grant_type",
        error_description:
          "Only client_credentials and refresh_token grant types are supported",
      });
    });

    test("client_idが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "client_id is required",
      });
    });

    test("client_secretが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "client_secret is required",
      });
    });

    test("refresh_token grantでrefresh_tokenが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "refresh_token is required for refresh_token grant",
      });
    });
  });

  describe("Client Credentials Grant", () => {
    test("正常なリクエストでトークンを取得できる", async () => {
      // openid-client TokenSet のモック
      const mockTokenSet = {
        access_token: "eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc...",
        scope: "mcp:access",
      };

      mockGrant.mockResolvedValueOnce(mockTokenSet);

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("scope", "mcp:access");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc...",
        scope: "mcp:access",
      });

      // grant メソッドが正しく呼ばれたか確認
      expect(mockGrant).toHaveBeenCalledWith({
        grant_type: "client_credentials",
        scope: "mcp:access",
      });
    });

    test("Keycloakがエラーを返した場合、エラーレスポンスを返す", async () => {
      // openid-client OPError をスロー
      const { errors } = await import("openid-client");
      mockGrant.mockRejectedValueOnce(
        new errors.OPError({
          error: "invalid_client",
          error_description: "Invalid client credentials",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "invalid-client");
      formData.append("client_secret", "invalid-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client",
        error_description: "Invalid client credentials",
      });
    });
  });

  describe("Refresh Token Grant", () => {
    test("正常なrefresh_tokenでトークンを更新できる", async () => {
      // openid-client TokenSet のモック
      const mockTokenSet = {
        access_token: "new_eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "new_refresh_token",
        scope: "mcp:access",
      };

      mockRefresh.mockResolvedValueOnce(mockTokenSet);

      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("refresh_token", "old_refresh_token");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "new_eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "new_refresh_token",
        scope: "mcp:access",
      });

      // refresh メソッドが正しく呼ばれたか確認
      expect(mockRefresh).toHaveBeenCalledWith("old_refresh_token");
    });

    test("無効なrefresh_tokenの場合、エラーレスポンスを返す", async () => {
      // openid-client OPError をスロー
      const { errors } = await import("openid-client");
      mockRefresh.mockRejectedValueOnce(
        new errors.OPError({
          error: "invalid_grant",
          error_description: "Invalid refresh token",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("refresh_token", "invalid_refresh_token");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid refresh token",
      });
    });
  });

  describe("エラーハンドリング", () => {
    test("KEYCLOAK_ISSUER環境変数が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

      // Issuer.discover がエラーをスローするようにモック
      mockDiscover.mockRejectedValueOnce(
        new Error("KEYCLOAK_ISSUER environment variable is not set"),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toMatchObject({
        error: "server_error",
      });
    });

    test("ネットワークエラーが発生した場合、500エラーを返す", async () => {
      // Issuer.discover がネットワークエラーをスローするようにモック
      mockDiscover.mockRejectedValueOnce(new Error("Network error"));

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "server_error",
        error_description: "Network error",
      });
    });
  });
});
