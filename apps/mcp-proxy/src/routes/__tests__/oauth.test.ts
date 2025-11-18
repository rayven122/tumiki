import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { oauthTokenHandler } from "../oauth.js";

// モックの設定
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

// グローバル fetch のモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalKeycloakIssuer !== undefined) {
      process.env.KEYCLOAK_ISSUER = originalKeycloakIssuer;
    } else {
      delete process.env.KEYCLOAK_ISSUER;
    }
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
      // Keycloak からのモックレスポンス
      const mockTokenResponse = {
        access_token: "eyJhbGc...",
        token_type: "Bearer" as const,
        expires_in: 300,
        refresh_token: "eyJhbGc...",
        scope: "mcp:access",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

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
      expect(body).toStrictEqual(mockTokenResponse);

      // Keycloak へのリクエストが正しく行われたか確認
      expect(mockFetch).toHaveBeenCalledWith(
        "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }),
      );
    });

    test("Keycloakがエラーを返した場合、エラーレスポンスを返す", async () => {
      // Keycloak からのモックエラーレスポンス
      const mockErrorResponse = {
        error: "invalid_client",
        error_description: "Invalid client credentials",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      });

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
      expect(body).toStrictEqual(mockErrorResponse);
    });
  });

  describe("Refresh Token Grant", () => {
    test("正常なrefresh_tokenでトークンを更新できる", async () => {
      // Keycloak からのモックレスポンス
      const mockTokenResponse = {
        access_token: "new_eyJhbGc...",
        token_type: "Bearer" as const,
        expires_in: 300,
        refresh_token: "new_refresh_token",
        scope: "mcp:access",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

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
      expect(body).toStrictEqual(mockTokenResponse);
    });

    test("無効なrefresh_tokenの場合、エラーレスポンスを返す", async () => {
      // Keycloak からのモックエラーレスポンス
      const mockErrorResponse = {
        error: "invalid_grant",
        error_description: "Invalid refresh token",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
      });

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

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual(mockErrorResponse);
    });
  });

  describe("エラーハンドリング", () => {
    test("KEYCLOAK_ISSUER環境変数が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

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
        error: "invalid_request",
      });
    });

    test("ネットワークエラーが発生した場合、500エラーを返す", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

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
        error: "invalid_request",
        error_description: "Network error",
      });
    });
  });
});
