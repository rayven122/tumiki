import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { dcrHandler } from "../oauth.js";
import { clearKeycloakCache } from "../../libs/auth/keycloak.js";
import { errors } from "openid-client";

// vi.hoisted でモック関数を定義（ホイスティング問題を回避）
const { mockDiscover, mockRegister, MockClient } = vi.hoisted(() => {
  const register = vi.fn();
  const Client = vi.fn().mockImplementation(() => ({}));
  // Client.register を静的メソッドとして追加
  (Client as unknown as { register: typeof register }).register = register;
  return {
    mockDiscover: vi.fn(),
    mockRegister: register,
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
vi.mock("openid-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("openid-client")>();
  return {
    ...original,
    Issuer: {
      discover: mockDiscover,
    },
  };
});

// デフォルトの Issuer モック値を作成するヘルパー
const createMockIssuer = (registrationEndpoint?: string | null) => {
  // Client.register を含む Issuer を返す
  const issuer = {
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
  };

  // Client に register 静的メソッドを追加
  (issuer.Client as unknown as { register: typeof mockRegister }).register =
    mockRegister;

  return issuer;
};

// モック登録済みクライアントを作成するヘルパー
const createMockRegisteredClient = (metadata: Record<string, unknown>) => ({
  metadata: {
    client_id: "generated-client-id",
    ...metadata,
  },
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
      mockRegister.mockResolvedValueOnce(
        createMockRegisteredClient({
          redirect_uris: ["http://localhost:3000/callback"],
        }),
      );

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
      mockRegister.mockResolvedValueOnce(
        createMockRegisteredClient({
          redirect_uris: ["http://127.0.0.1:3000/callback"],
        }),
      );

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
      const mockClientMetadata = {
        client_id: "generated-client-id",
        client_secret: "generated-secret",
        client_id_issued_at: 1234567890,
        client_secret_expires_at: 0,
        redirect_uris: ["https://example.com/callback"],
        client_name: "Test Client",
      };

      mockRegister.mockResolvedValueOnce(
        createMockRegisteredClient(mockClientMetadata),
      );

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
      // JSON シリアライズ時に undefined は省略されるため、含まれないプロパティは検証しない
      expect(body).toStrictEqual({
        client_id: "generated-client-id",
        client_secret: "generated-secret",
        client_id_issued_at: 1234567890,
        client_secret_expires_at: 0,
        redirect_uris: ["https://example.com/callback"],
        client_name: "Test Client",
      });

      // Client.register が正しく呼ばれたか確認
      expect(mockRegister).toHaveBeenCalledWith(
        {
          redirect_uris: ["https://example.com/callback"],
          client_name: "Test Client",
          grant_types: ["authorization_code"],
          response_types: ["code"],
        },
        { initialAccessToken: undefined },
      );
    });

    test("Initial Access Tokenが渡される", async () => {
      mockRegister.mockResolvedValueOnce(
        createMockRegisteredClient({
          redirect_uris: ["https://example.com/callback"],
        }),
      );

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

      // initialAccessToken が渡されたか確認
      expect(mockRegister).toHaveBeenCalledWith(
        { redirect_uris: ["https://example.com/callback"] },
        { initialAccessToken: "initial-access-token" },
      );
    });

    test("registration_access_tokenとregistration_client_uriが返される", async () => {
      mockRegister.mockResolvedValueOnce(
        createMockRegisteredClient({
          redirect_uris: ["https://example.com/callback"],
          registration_access_token: "reg-access-token",
          registration_client_uri:
            "https://keycloak.example.com/clients/generated-client-id",
        }),
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

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        registration_access_token: string;
        registration_client_uri: string;
      };
      expect(body.registration_access_token).toBe("reg-access-token");
      expect(body.registration_client_uri).toBe(
        "https://keycloak.example.com/clients/generated-client-id",
      );
    });
  });

  describe("エラーハンドリング", () => {
    test("OPErrorが発生した場合、RFC 7591形式のエラーを返す", async () => {
      // OPError をシミュレート
      const opError = new errors.OPError({
        error: "invalid_redirect_uri",
        error_description: "Invalid redirect URI",
      });
      // response プロパティを追加（http.IncomingMessage の statusCode を使用）
      Object.defineProperty(opError, "response", {
        value: { statusCode: 400 },
        writable: true,
      });

      mockRegister.mockRejectedValueOnce(opError);

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

    test("OPErrorで認証エラーが発生した場合、401エラーを返す", async () => {
      const opError = new errors.OPError({
        error: "invalid_client_metadata",
        error_description: "Initial access token required",
      });
      Object.defineProperty(opError, "response", {
        value: { statusCode: 401 },
        writable: true,
      });

      mockRegister.mockRejectedValueOnce(opError);

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

    test("未知のOPErrorコードはinvalid_client_metadataに変換される", async () => {
      const opError = new errors.OPError({
        error: "unknown_error_code",
        error_description: "Some unknown error",
      });
      Object.defineProperty(opError, "response", {
        value: { statusCode: 400 },
        writable: true,
      });

      mockRegister.mockRejectedValueOnce(opError);

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
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_client_metadata");
    });

    test("ネットワークエラーが発生した場合、500エラーを返す", async () => {
      mockRegister.mockRejectedValueOnce(new Error("Network error"));

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
