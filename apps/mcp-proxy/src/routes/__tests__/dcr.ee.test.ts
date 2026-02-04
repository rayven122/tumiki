import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { dcrHandler } from "../oauth.ee.js";
import { clearKeycloakCache } from "../../libs/auth/keycloak.ee.js";

// vi.hoisted でモック関数とクラスを定義（ホイスティング問題を回避）
const { mockDiscovery, mockDynamicClientRegistration, MockResponseBodyError } =
  vi.hoisted(() => {
    // テスト用 ResponseBodyError クラス（v6 のコンストラクタシグネチャに対応）
    class MockResponseBodyErrorClass extends Error {
      error: string;
      error_description?: string;
      status: number;
      response: Response;

      constructor(
        response: Response,
        cause: { error: string; error_description?: string },
      ) {
        super(cause.error_description ?? cause.error);
        this.name = "ResponseBodyError";
        this.error = cause.error;
        this.error_description = cause.error_description;
        this.status = response.status;
        this.response = response;
      }
    }

    return {
      mockDiscovery: vi.fn(),
      mockDynamicClientRegistration: vi.fn(),
      MockResponseBodyError: MockResponseBodyErrorClass,
    };
  });

// モックの設定
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

// openid-client v6 のモック
vi.mock("openid-client", () => ({
  discovery: mockDiscovery,
  dynamicClientRegistration: mockDynamicClientRegistration,
  Configuration: vi.fn(),
  ClientSecretPost: vi.fn(() => "client_secret_post"),
  None: vi.fn(() => "none"),
  ResponseBodyError: MockResponseBodyError,
}));

// テスト用の ServerMetadata
const mockServerMetadata = {
  issuer: "https://keycloak.example.com/realms/tumiki",
  token_endpoint:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
  jwks_uri:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
  registration_endpoint:
    "https://keycloak.example.com/realms/tumiki/clients-registrations/openid-connect",
};

// モック Configuration オブジェクトを作成するヘルパー
const createMockConfiguration = (metadata = mockServerMetadata) => ({
  serverMetadata: () => metadata,
});

// v6: dynamicClientRegistration は Configuration を返す
// clientMetadata() でクライアントメタデータを取得
const createMockRegistrationResponse = (metadata: Record<string, unknown>) => ({
  clientMetadata: () => ({
    client_id: "generated-client-id",
    ...metadata,
  }),
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

    // デフォルトの discovery モックを設定
    mockDiscovery.mockResolvedValue(createMockConfiguration());
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
      mockDynamicClientRegistration.mockResolvedValueOnce(
        createMockRegistrationResponse({
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
      mockDynamicClientRegistration.mockResolvedValueOnce(
        createMockRegistrationResponse({
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

      mockDynamicClientRegistration.mockResolvedValueOnce(
        createMockRegistrationResponse(mockClientMetadata),
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

      // v6: dynamicClientRegistration が正しく呼ばれたか確認
      expect(mockDynamicClientRegistration).toHaveBeenCalledWith(
        expect.any(URL), // Keycloak Issuer URL
        {
          redirect_uris: ["https://example.com/callback"],
          client_name: "Test Client",
          grant_types: ["authorization_code"],
          response_types: ["code"],
        },
        undefined, // clientAuth
        {}, // options（Initial Access Token なし、HTTPS なので execute もなし）
      );
    });

    test("Initial Access Tokenが渡される", async () => {
      mockDynamicClientRegistration.mockResolvedValueOnce(
        createMockRegistrationResponse({
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

      // v6: initialAccessToken がオプションとして渡されるか確認
      expect(mockDynamicClientRegistration).toHaveBeenCalledWith(
        expect.any(URL),
        { redirect_uris: ["https://example.com/callback"] },
        undefined,
        { initialAccessToken: "initial-access-token" },
      );
    });

    test("registration_access_tokenとregistration_client_uriが返される", async () => {
      mockDynamicClientRegistration.mockResolvedValueOnce(
        createMockRegistrationResponse({
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
    test("ResponseBodyErrorが発生した場合、RFC 7591形式のエラーを返す", async () => {
      // openid-client v6 ResponseBodyError をスロー
      mockDynamicClientRegistration.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 400 }), {
          error: "invalid_redirect_uri",
          error_description: "Invalid redirect URI",
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

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_redirect_uri",
        error_description: "Invalid redirect URI",
      });
    });

    test("ResponseBodyErrorで認証エラーが発生した場合、401エラーを返す", async () => {
      // openid-client v6 ResponseBodyError をスロー
      mockDynamicClientRegistration.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 401 }), {
          error: "invalid_client_metadata",
          error_description: "Initial access token required",
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

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "Initial access token required",
      });
    });

    test("ResponseBodyErrorコードはそのまま返される", async () => {
      mockDynamicClientRegistration.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 400 }), {
          error: "unknown_error_code",
          error_description: "Some unknown error",
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

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      // 案1: openid-client のエラーフィールドをそのまま使用
      expect(body.error).toBe("unknown_error_code");
    });

    test("ネットワークエラーが発生した場合、500エラーを返す", async () => {
      mockDynamicClientRegistration.mockRejectedValueOnce(
        new Error("Network error"),
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
      expect(body).toStrictEqual({
        error: "invalid_client_metadata",
        error_description: "Network error",
      });
    });

    test("KEYCLOAK_ISSUER環境変数が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;
      clearKeycloakCache();

      // DCR ハンドラーは直接 KEYCLOAK_ISSUER をチェックするので、
      // dynamicClientRegistration がエラーをスローする前にエラーになる
      mockDynamicClientRegistration.mockRejectedValueOnce(
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
