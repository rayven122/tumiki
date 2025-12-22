import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { dcrHandler } from "../oauth.js";
import { clearKeycloakCache } from "../../libs/auth/keycloak.js";

// vi.hoisted でモック関数を定義（ホイスティング問題を回避）
const { mockDiscover, MockClient } = vi.hoisted(() => {
  const Client = vi.fn().mockImplementation(() => ({}));
  return {
    mockDiscover: vi.fn(),
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

// openid-client のモック
vi.mock("openid-client", () => ({
  Issuer: {
    discover: mockDiscover,
  },
}));

// fetch のモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// デフォルトの Issuer モック値を作成するヘルパー
const createMockIssuer = (registrationEndpoint?: string | null) => ({
  issuer: "https://keycloak.example.com/realms/tumiki",
  metadata: {
    issuer: "https://keycloak.example.com/realms/tumiki",
    token_endpoint:
      "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
    jwks_uri:
      "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
    registration_endpoint:
      registrationEndpoint === null
        ? undefined
        : (registrationEndpoint ??
          "https://keycloak.example.com/realms/tumiki/clients-registrations/openid-connect"),
  },
  Client: MockClient,
});

describe("dcrHandler", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.post("/oauth/register", dcrHandler);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";

    // キャッシュをクリア
    clearKeycloakCache();

    vi.clearAllMocks();

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
    test("Content-Typeがapplication/jsonでない場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "test",
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "Content-Type must be application/json",
      });
    });

    test("不正なJSONボディの場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "Invalid JSON body",
      });
    });

    test("redirect_urisが存在しない場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_name: "Test Client" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "redirect_uris is required and must be an array",
      });
    });

    test("redirect_urisが空配列の場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ redirect_uris: [] }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "redirect_uris must contain at least one URI",
      });
    });

    test("redirect_urisが不正なURL形式の場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["not-a-valid-url"],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_redirect_uri",
        error_description: "Invalid URL format: not-a-valid-url",
      });
    });

    test("redirect_urisがHTTPSでない場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["http://example.com/callback"],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_redirect_uri",
        error_description:
          "redirect_uri must use HTTPS (except localhost): http://example.com/callback",
      });
    });

    test("localhostの場合はHTTPを許可する", async () => {
      const mockClientResponse = {
        client_id: "generated-client-id",
        redirect_uris: ["http://localhost:3000/callback"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockClientResponse,
      });

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["http://localhost:3000/callback"],
        }),
      });

      expect(res.status).toBe(201);
    });

    test("127.0.0.1の場合もHTTPを許可する", async () => {
      const mockClientResponse = {
        client_id: "generated-client-id",
        redirect_uris: ["http://127.0.0.1:3000/callback"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockClientResponse,
      });

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["http://127.0.0.1:3000/callback"],
        }),
      });

      expect(res.status).toBe(201);
    });
  });

  describe("正常系", () => {
    test("正常なリクエストでクライアントが登録される", async () => {
      const mockClientResponse = {
        client_id: "generated-client-id",
        client_secret: "generated-secret",
        client_id_issued_at: 1234567890,
        client_secret_expires_at: 0,
        redirect_uris: ["https://example.com/callback"],
        client_name: "Test Client",
        grant_types: ["authorization_code"],
        response_types: ["code"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockClientResponse,
      });

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
          client_name: "Test Client",
          grant_types: ["authorization_code"],
          response_types: ["code"],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toStrictEqual(mockClientResponse);

      // fetch が正しく呼ばれたか確認
      expect(mockFetch).toHaveBeenCalledWith(
        "https://keycloak.example.com/realms/tumiki/clients-registrations/openid-connect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            redirect_uris: ["https://example.com/callback"],
            client_name: "Test Client",
            grant_types: ["authorization_code"],
            response_types: ["code"],
          }),
        },
      );
    });

    test("Initial Access Tokenがヘッダーで転送される", async () => {
      const mockClientResponse = {
        client_id: "generated-client-id",
        redirect_uris: ["https://example.com/callback"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockClientResponse,
      });

      await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer initial-access-token",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        headers: {
          Authorization: "Bearer initial-access-token",
        },
      });
    });
  });

  describe("エラーハンドリング", () => {
    test("registration_endpointがない場合、501エラーを返す", async () => {
      // registration_endpoint がない Issuer を返す
      mockDiscover.mockResolvedValueOnce(createMockIssuer(null));
      clearKeycloakCache();

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(501);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description:
          "Server does not support Dynamic Client Registration",
      });
    });

    test("Keycloakがエラーを返した場合、エラーレスポンスを転送する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: "invalid_redirect_uri",
          error_description: "Invalid redirect URI",
        }),
      });

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_redirect_uri",
        error_description: "Invalid redirect URI",
      });
    });

    test("Keycloakが認証エラーを返した場合、401エラーを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: "invalid_client_metadata",
          error_description: "Initial access token required",
        }),
      });

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "Initial access token required",
      });
    });

    test("ネットワークエラーが発生した場合、500エラーを返す", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "Network error",
      });
    });

    test("KEYCLOAK_ISSUER環境変数が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;
      clearKeycloakCache();

      // Issuer.discover がエラーをスローするようにモック
      mockDiscover.mockRejectedValueOnce(
        new Error("KEYCLOAK_ISSUER environment variable is not set"),
      );

      const res = await app.request("/oauth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirect_uris: ["https://example.com/callback"],
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toMatchObject({
        error: "invalid_client_metadata",
      });
    });
  });
});
