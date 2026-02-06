import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { PiiMaskingMode } from "@tumiki/db/server";
import type { HonoEnv } from "../../../../../shared/types/honoEnv.js";
import { wellKnownRoute } from "../route.js";
import { clearKeycloakCache } from "../../../../../infrastructure/keycloak/keycloakConfig.js";
import type { McpServerLookupResult } from "../../../../../infrastructure/db/repositories/mcpServerRepository.js";

// vi.hoisted でモック関数を定義（ホイスティング問題を回避）
const { mockDiscovery, mockGetMcpServerOrganization } = vi.hoisted(() => ({
  mockDiscovery: vi.fn(),
  mockGetMcpServerOrganization: vi.fn(),
}));

// モックの設定
vi.mock("../../../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

// openid-client v6 のモック
vi.mock("openid-client", () => ({
  discovery: mockDiscovery,
  Configuration: vi.fn(),
  ClientSecretPost: vi.fn(() => "client_secret_post"),
  None: vi.fn(() => "none"),
}));

// mcpServerService のモック
vi.mock(
  "../../../../../infrastructure/db/repositories/mcpServerRepository.js",
  () => ({
    getMcpServerOrganization: mockGetMcpServerOrganization,
  }),
);

// テスト用の ServerMetadata
const mockServerMetadata = {
  issuer: "https://keycloak.example.com/realms/tumiki",
  authorization_endpoint:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/auth",
  token_endpoint:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
  jwks_uri:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
  registration_endpoint:
    "https://keycloak.example.com/realms/tumiki/clients-registrations/openid-connect",
};

// v6: Configuration を返すヘルパー
const createMockConfiguration = (metadata = mockServerMetadata) => ({
  serverMetadata: () => metadata,
});

describe("GET /.well-known/oauth-authorization-server/mcp/:mcpServerId", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;
  let originalMcpProxyUrl: string | undefined;

  // テスト用のモック McpServer データ（authType: OAUTH）
  const mockMcpServer: McpServerLookupResult = {
    id: "test-mcp-server-id",
    organizationId: "test-org-id",
    deletedAt: null,
    authType: "OAUTH",
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
  };

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.route("/.well-known", wellKnownRoute);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;
    originalMcpProxyUrl = process.env.NEXT_PUBLIC_MCP_PROXY_URL;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";
    process.env.NEXT_PUBLIC_MCP_PROXY_URL = "http://localhost:8080";

    // キャッシュをクリア
    clearKeycloakCache();

    vi.clearAllMocks();

    // デフォルトの discovery モックを設定
    mockDiscovery.mockResolvedValue(createMockConfiguration());

    // デフォルトで McpServer が存在するモックを設定
    mockGetMcpServerOrganization.mockResolvedValue(mockMcpServer);
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalKeycloakIssuer !== undefined) {
      process.env.KEYCLOAK_ISSUER = originalKeycloakIssuer;
    } else {
      delete process.env.KEYCLOAK_ISSUER;
    }

    if (originalMcpProxyUrl !== undefined) {
      process.env.NEXT_PUBLIC_MCP_PROXY_URL = originalMcpProxyUrl;
    } else {
      delete process.env.NEXT_PUBLIC_MCP_PROXY_URL;
    }

    // キャッシュをクリア
    clearKeycloakCache();
  });

  describe("McpServer が存在し authType が OAUTH の場合", () => {
    beforeEach(() => {
      mockGetMcpServerOrganization.mockResolvedValue(mockMcpServer);
    });

    test("認証なしで200 JSONメタデータを返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        issuer: "http://localhost:8080",
        token_endpoint: "http://localhost:8080/oauth/token",
        registration_endpoint: "http://localhost:8080/oauth/register",
      });
    });

    test("RFC 8414 準拠のメタデータを返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        issuer: "http://localhost:8080",
        authorization_endpoint:
          "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/auth",
        token_endpoint: "http://localhost:8080/oauth/token",
        registration_endpoint: "http://localhost:8080/oauth/register",
        jwks_uri:
          "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
        response_types_supported: ["code"],
        grant_types_supported: [
          "authorization_code",
          "refresh_token",
          "client_credentials",
        ],
        token_endpoint_auth_methods_supported: [
          "client_secret_post",
          "client_secret_basic",
        ],
        code_challenge_methods_supported: ["S256"],
      });
    });

    test("Authorization ヘッダーなしでアクセスできる（認証不要）", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
    });

    test("Authorization ヘッダーがあっても無視される", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-mcp-server-id",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        },
      );

      // 認証エラーにならず、メタデータを返す
      expect(res.status).toBe(200);
    });

    test("getMcpServerOrganization が正しい mcpServerId で呼び出される", async () => {
      await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(mockGetMcpServerOrganization).toHaveBeenCalledWith(
        "test-mcp-server-id",
      );
    });
  });

  describe("McpServer が存在しない場合", () => {
    beforeEach(() => {
      mockGetMcpServerOrganization.mockResolvedValue(null);
    });

    test("404 Not Found を返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/non-existent-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "not_found",
        error_description: "MCP Server not found: non-existent-id",
      });
    });
  });

  describe("authType が OAUTH でない場合", () => {
    test("authType が API_KEY の場合、404 を返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "api-key-server-id",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "API_KEY" as const,
      });

      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/api-key-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "oauth_not_supported",
        error_description:
          "This MCP Server does not support OAuth authentication. DCR is not available.",
      });
    });

    test("authType が NONE の場合、404 を返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "no-auth-server-id",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "NONE" as const,
      });

      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/no-auth-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "oauth_not_supported",
        error_description:
          "This MCP Server does not support OAuth authentication. DCR is not available.",
      });
    });
  });

  describe("エラーハンドリング", () => {
    test("KEYCLOAK_ISSUER が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "server_misconfiguration",
        error_description:
          "KEYCLOAK_ISSUER environment variable is not set. Please configure Keycloak integration.",
      });
    });
  });
});

describe("GET /.well-known/oauth-protected-resource/mcp/:mcpServerId", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;
  let originalMcpResourceUrl: string | undefined;

  // テスト用のモック McpServer データ（authType: OAUTH）
  const mockMcpServer: McpServerLookupResult = {
    id: "test-mcp-server-id",
    organizationId: "test-org-id",
    deletedAt: null,
    authType: "OAUTH",
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
  };

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.route("/.well-known", wellKnownRoute);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;
    originalMcpResourceUrl = process.env.MCP_RESOURCE_URL;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";
    process.env.MCP_RESOURCE_URL = "http://localhost:8080/mcp";

    vi.clearAllMocks();

    // デフォルトで McpServer が存在するモックを設定
    mockGetMcpServerOrganization.mockResolvedValue(mockMcpServer);
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalKeycloakIssuer !== undefined) {
      process.env.KEYCLOAK_ISSUER = originalKeycloakIssuer;
    } else {
      delete process.env.KEYCLOAK_ISSUER;
    }

    if (originalMcpResourceUrl !== undefined) {
      process.env.MCP_RESOURCE_URL = originalMcpResourceUrl;
    } else {
      delete process.env.MCP_RESOURCE_URL;
    }
  });

  describe("McpServer が存在する場合", () => {
    beforeEach(() => {
      mockGetMcpServerOrganization.mockResolvedValue(mockMcpServer);
    });

    test("RFC 9728 準拠のメタデータを返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;

      expect(body).toStrictEqual({
        resource: "http://localhost:8080/mcp/test-mcp-server-id",
        authorization_servers: ["http://localhost:8080"],
        scopes_supported: [],
        bearer_methods_supported: ["header"],
        resource_documentation: "https://docs.tumiki.cloud/mcp",
        resource_signing_alg_values_supported: ["RS256"],
      });
    });

    test("認証なしでアクセスできる（公開メタデータ）", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("authorization_servers");
    });

    test("Authorization ヘッダーがあっても無視される", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("authorization_servers");
    });

    test("パスパラメータの値を resource に反映する", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "another-server-id",
        organizationId: "another-org-id",
        deletedAt: null,
        authType: "OAUTH" as const,
      });

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/another-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.resource).toBe("http://localhost:8080/mcp/another-server-id");
    });

    test("getMcpServerOrganization が正しい mcpServerId で呼び出される", async () => {
      await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(mockGetMcpServerOrganization).toHaveBeenCalledWith(
        "test-mcp-server-id",
      );
    });
  });

  describe("McpServer が存在しない場合", () => {
    beforeEach(() => {
      mockGetMcpServerOrganization.mockResolvedValue(null);
    });

    test("404 Not Found を返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/non-existent-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "not_found",
        error_description: "MCP Server not found: non-existent-id",
      });
    });
  });

  describe("authType が OAUTH でない場合", () => {
    test("authType が API_KEY の場合、404 を返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "api-key-server-id",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "API_KEY" as const,
      });

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/api-key-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "oauth_not_supported",
        error_description:
          "This MCP Server does not support OAuth authentication. DCR is not available.",
      });
    });

    test("authType が NONE の場合、404 を返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "no-auth-server-id",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "NONE" as const,
      });

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/no-auth-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "oauth_not_supported",
        error_description:
          "This MCP Server does not support OAuth authentication. DCR is not available.",
      });
    });

    test("authType が OAUTH の場合のみ、OAuth メタデータを返す", async () => {
      mockGetMcpServerOrganization.mockResolvedValue({
        id: "oauth-server-id",
        organizationId: "test-org-id",
        deletedAt: null,
        authType: "OAUTH" as const,
      });

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/oauth-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("authorization_servers");
      expect(body.resource).toBe("http://localhost:8080/mcp/oauth-server-id");
    });
  });

  describe("メタデータの構造検証", () => {
    test("authorization_servers は配列である", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      expect(Array.isArray(body.authorization_servers)).toBe(true);
      if (Array.isArray(body.authorization_servers)) {
        expect(body.authorization_servers.length).toBeGreaterThan(0);
      }
    });

    test("scopes_supported は空配列である", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      expect(body.scopes_supported).toStrictEqual([]);
    });

    test("bearer_methods_supported は配列である", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      expect(Array.isArray(body.bearer_methods_supported)).toBe(true);
      expect(body.bearer_methods_supported).toContain("header");
    });

    test("resource_signing_alg_values_supported は配列である", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      expect(Array.isArray(body.resource_signing_alg_values_supported)).toBe(
        true,
      );
      expect(body.resource_signing_alg_values_supported).toContain("RS256");
    });
  });

  describe("MCP 2025-DRAFT-v2 準拠", () => {
    test("MCP仕様で必須の authorization_servers フィールドを含む", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("authorization_servers");
      expect(Array.isArray(body.authorization_servers)).toBe(true);
      if (Array.isArray(body.authorization_servers)) {
        expect(body.authorization_servers.length).toBeGreaterThan(0);
      }
    });

    test("MCP Proxy URL が authorization_servers に含まれる", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      const body = (await res.json()) as Record<string, unknown>;
      // RFC 9728: authorization_servers には mcp-proxy の URL を指定
      // クライアントはここから AS Metadata を取得する
      expect(body.authorization_servers).toContain("http://localhost:8080");
    });
  });

  describe("エラーハンドリング", () => {
    test("KEYCLOAK_ISSUER が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "server_misconfiguration",
        error_description:
          "KEYCLOAK_ISSUER environment variable is not set. Please configure Keycloak integration.",
      });
    });

    test("MCP_RESOURCE_URL が設定されていない場合、デフォルト値を使用", async () => {
      delete process.env.MCP_RESOURCE_URL;

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/test-mcp-server-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.resource).toBe(
        "http://localhost:8080/mcp/test-mcp-server-id",
      );
      expect(body).toHaveProperty("authorization_servers");
    });
  });
});

/**
 * ルートレベルのメタデータエンドポイントのテスト
 * MCPクライアントはこれらのエンドポイントからOAuth設定を自動検出する
 */
describe("GET /.well-known/oauth-authorization-server（ルートレベル）", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;
  let originalMcpProxyUrl: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.route("/.well-known", wellKnownRoute);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;
    originalMcpProxyUrl = process.env.NEXT_PUBLIC_MCP_PROXY_URL;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";
    process.env.NEXT_PUBLIC_MCP_PROXY_URL = "http://localhost:8080";

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

    if (originalMcpProxyUrl !== undefined) {
      process.env.NEXT_PUBLIC_MCP_PROXY_URL = originalMcpProxyUrl;
    } else {
      delete process.env.NEXT_PUBLIC_MCP_PROXY_URL;
    }

    // キャッシュをクリア
    clearKeycloakCache();
  });

  test("RFC 8414準拠のメタデータを返す", async () => {
    const res = await app.request("/.well-known/oauth-authorization-server", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    // RFC 8414 必須フィールド
    expect(body).toHaveProperty("issuer");
    expect(body).toHaveProperty("authorization_endpoint");
    expect(body).toHaveProperty("token_endpoint");

    // 値の検証
    expect(body.issuer).toBe("http://localhost:8080");
    expect(body.authorization_endpoint).toBe(
      "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/auth",
    );
    expect(body.token_endpoint).toBe("http://localhost:8080/oauth/token");
    expect(body.registration_endpoint).toBe(
      "http://localhost:8080/oauth/register",
    );
  });

  test("DEV_MODE に関わらず常に有効", async () => {
    // DEV_MODE を未設定にする
    delete process.env.DEV_MODE;

    const res = await app.request("/.well-known/oauth-authorization-server", {
      method: "GET",
    });

    // ルートレベルは DEV_MODE チェックなしで常に有効
    expect(res.status).toBe(200);
  });

  test("完全なメタデータ構造を返す", async () => {
    const res = await app.request("/.well-known/oauth-authorization-server", {
      method: "GET",
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toStrictEqual({
      issuer: "http://localhost:8080",
      authorization_endpoint:
        "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/auth",
      token_endpoint: "http://localhost:8080/oauth/token",
      registration_endpoint: "http://localhost:8080/oauth/register",
      jwks_uri:
        "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
      response_types_supported: ["code"],
      grant_types_supported: [
        "authorization_code",
        "refresh_token",
        "client_credentials",
      ],
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
      ],
      code_challenge_methods_supported: ["S256"],
    });
  });

  test("KEYCLOAK_ISSUER が設定されていない場合、500エラーを返す", async () => {
    delete process.env.KEYCLOAK_ISSUER;

    const res = await app.request("/.well-known/oauth-authorization-server", {
      method: "GET",
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toStrictEqual({
      error: "server_misconfiguration",
      error_description:
        "KEYCLOAK_ISSUER environment variable is not set. Please configure Keycloak integration.",
    });
  });
});

describe("GET /.well-known/oauth-protected-resource（ルートレベル）", () => {
  let app: Hono<HonoEnv>;
  let originalMcpProxyUrl: string | undefined;
  let originalMcpResourceUrl: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.route("/.well-known", wellKnownRoute);

    // 環境変数を保存
    originalMcpProxyUrl = process.env.NEXT_PUBLIC_MCP_PROXY_URL;
    originalMcpResourceUrl = process.env.MCP_RESOURCE_URL;

    // テスト用の環境変数を設定
    process.env.NEXT_PUBLIC_MCP_PROXY_URL = "http://localhost:8080";

    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalMcpProxyUrl !== undefined) {
      process.env.NEXT_PUBLIC_MCP_PROXY_URL = originalMcpProxyUrl;
    } else {
      delete process.env.NEXT_PUBLIC_MCP_PROXY_URL;
    }

    if (originalMcpResourceUrl !== undefined) {
      process.env.MCP_RESOURCE_URL = originalMcpResourceUrl;
    } else {
      delete process.env.MCP_RESOURCE_URL;
    }
  });

  test("RFC 9728準拠のメタデータを返す", async () => {
    const res = await app.request("/.well-known/oauth-protected-resource", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    // RFC 9728 必須フィールド
    expect(body).toHaveProperty("resource");
    expect(body).toHaveProperty("authorization_servers");

    // 値の検証
    expect(body.resource).toBe("http://localhost:8080/mcp");
    expect(body.authorization_servers).toStrictEqual(["http://localhost:8080"]);
  });

  test("DEV_MODE に関わらず常に有効", async () => {
    // DEV_MODE を未設定にする
    delete process.env.DEV_MODE;

    const res = await app.request("/.well-known/oauth-protected-resource", {
      method: "GET",
    });

    // ルートレベルは DEV_MODE チェックなしで常に有効
    expect(res.status).toBe(200);
  });

  test("完全なメタデータ構造を返す", async () => {
    const res = await app.request("/.well-known/oauth-protected-resource", {
      method: "GET",
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toStrictEqual({
      resource: "http://localhost:8080/mcp",
      authorization_servers: ["http://localhost:8080"],
      scopes_supported: [],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://docs.tumiki.cloud/mcp",
      resource_signing_alg_values_supported: ["RS256"],
    });
  });

  test("MCP_RESOURCE_URL が設定されている場合、その値を使用", async () => {
    process.env.MCP_RESOURCE_URL = "https://custom-mcp.example.com/mcp";

    const res = await app.request("/.well-known/oauth-protected-resource", {
      method: "GET",
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.resource).toBe("https://custom-mcp.example.com/mcp");
  });

  test("MCP_RESOURCE_URL が未設定の場合、NEXT_PUBLIC_MCP_PROXY_URL から導出", async () => {
    delete process.env.MCP_RESOURCE_URL;

    const res = await app.request("/.well-known/oauth-protected-resource", {
      method: "GET",
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.resource).toBe("http://localhost:8080/mcp");
  });
});
