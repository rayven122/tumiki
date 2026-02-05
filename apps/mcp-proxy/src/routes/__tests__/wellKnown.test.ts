/**
 * Well-Known ルートのユニットテスト
 *
 * RFC 8414 (OAuth Authorization Server Metadata) と
 * RFC 9728 (OAuth Protected Resource Metadata) の実装をテスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { wellKnownRoute } from "../wellKnown.js";

const { mockGetKeycloakIssuer, mockGetMcpServerOrganization } = vi.hoisted(
  () => ({
    mockGetKeycloakIssuer: vi.fn(),
    mockGetMcpServerOrganization: vi.fn(),
  }),
);

// 外部依存をモック
vi.mock("../../libs/auth/keycloak.js", () => ({
  getKeycloakIssuer: mockGetKeycloakIssuer,
}));

vi.mock("../../services/mcpServerService.js", () => ({
  getMcpServerOrganization: mockGetMcpServerOrganization,
}));

describe("wellKnownRoute", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");
    vi.stubEnv("NEXT_PUBLIC_MCP_PROXY_URL", "https://mcp-proxy.example.com");
    vi.stubEnv("MCP_RESOURCE_URL", "https://mcp-proxy.example.com/mcp");

    // モックの戻り値を毎回再設定
    mockGetKeycloakIssuer.mockResolvedValue({
      metadata: {
        authorization_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/auth",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
      },
    });

    mockGetMcpServerOrganization.mockImplementation((mcpServerId: string) => {
      if (mcpServerId === "existing-server") {
        return Promise.resolve({
          id: "existing-server",
          organizationId: "org-123",
          authType: "OAUTH",
        });
      }
      if (mcpServerId === "api-key-server") {
        return Promise.resolve({
          id: "api-key-server",
          organizationId: "org-123",
          authType: "API_KEY",
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("GET /.well-known/oauth-authorization-server", () => {
    test("RFC 8414準拠のメタデータを返す", async () => {
      const res = await wellKnownRoute.request("/oauth-authorization-server");
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toStrictEqual(200);
      expect(body.issuer).toStrictEqual("https://mcp-proxy.example.com");
      expect(body.authorization_endpoint).toBeDefined();
      expect(body.token_endpoint).toStrictEqual(
        "https://mcp-proxy.example.com/oauth/token",
      );
      expect(body.registration_endpoint).toStrictEqual(
        "https://mcp-proxy.example.com/oauth/register",
      );
    });

    test("KEYCLOAK_ISSUERが未設定の場合はエラーを返す", async () => {
      vi.stubEnv("KEYCLOAK_ISSUER", "");

      const res = await wellKnownRoute.request("/oauth-authorization-server");
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(500);
      expect(body.error).toStrictEqual("server_misconfiguration");
    });
  });

  describe("GET /.well-known/oauth-protected-resource", () => {
    test("RFC 9728準拠のメタデータを返す", async () => {
      const res = await wellKnownRoute.request("/oauth-protected-resource");
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toStrictEqual(200);
      expect(body.resource).toStrictEqual("https://mcp-proxy.example.com/mcp");
      expect(body.authorization_servers).toContain(
        "https://mcp-proxy.example.com",
      );
    });

    test("bearer_methods_supportedを含む", async () => {
      const res = await wellKnownRoute.request("/oauth-protected-resource");
      const body = (await res.json()) as { bearer_methods_supported: string[] };

      expect(body.bearer_methods_supported).toContain("header");
    });
  });

  describe("GET /.well-known/oauth-authorization-server/mcp/:mcpServerId", () => {
    // モックが適切に動作していないため、基本的なルーティングテストのみ行う
    test("存在しないサーバーは404を返す", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-authorization-server/mcp/non-existing-server",
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(404);
      expect(body.error).toStrictEqual("not_found");
    });
  });

  describe("GET /.well-known/oauth-protected-resource/mcp/:mcpServerId", () => {
    test("存在しないサーバーは404を返す", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-protected-resource/mcp/non-existing-server",
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(404);
      expect(body.error).toStrictEqual("not_found");
    });

    test("KEYCLOAK_ISSUERが未設定の場合はエラーを返す", async () => {
      vi.stubEnv("KEYCLOAK_ISSUER", "");

      const res = await wellKnownRoute.request(
        "/oauth-protected-resource/mcp/existing-server",
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(500);
      expect(body.error).toStrictEqual("server_misconfiguration");
    });
  });

  describe("NEXT_PUBLIC_MCP_PROXY_URL未設定時のフォールバック", () => {
    beforeEach(() => {
      // unstubAllEnvsで前のstubEnvをリセットしてから、
      // NEXT_PUBLIC_MCP_PROXY_URL, MCP_RESOURCE_URLを除外して再設定
      vi.unstubAllEnvs();
      vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");
      // NEXT_PUBLIC_MCP_PROXY_URL と MCP_RESOURCE_URL はstubしない
      // → process.env から undefined になり ?? フォールバックが動作する
      delete process.env.NEXT_PUBLIC_MCP_PROXY_URL;
      delete process.env.MCP_RESOURCE_URL;
    });

    test("ルートoauth-authorization-serverでissuerがhttp://localhost:8080になる", async () => {
      const res = await wellKnownRoute.request("/oauth-authorization-server");

      expect(res.status).toStrictEqual(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.issuer).toStrictEqual("http://localhost:8080");
      expect(body.token_endpoint).toStrictEqual(
        "http://localhost:8080/oauth/token",
      );
      expect(body.registration_endpoint).toStrictEqual(
        "http://localhost:8080/oauth/register",
      );
    });

    test("ルートoauth-protected-resourceでauthorization_serversがhttp://localhost:8080になる", async () => {
      const res = await wellKnownRoute.request("/oauth-protected-resource");
      const body = (await res.json()) as Record<string, unknown>;

      expect(res.status).toStrictEqual(200);
      expect((body.authorization_servers as string[])[0]).toStrictEqual(
        "http://localhost:8080",
      );
    });

    test("インスタンス固有oauth-authorization-serverでissuerがhttp://localhost:8080になる", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-authorization-server/mcp/existing-server",
      );

      expect(res.status).toStrictEqual(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.issuer).toStrictEqual("http://localhost:8080");
      expect(body.token_endpoint).toStrictEqual(
        "http://localhost:8080/oauth/token",
      );
    });

    test("インスタンス固有oauth-protected-resourceでauthorization_serversがhttp://localhost:8080になる", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-protected-resource/mcp/existing-server",
      );

      expect(res.status).toStrictEqual(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect((body.authorization_servers as string[])[0]).toStrictEqual(
        "http://localhost:8080",
      );
    });
  });

  describe("authTypeがOAUTHでないサーバー", () => {
    test("oauth-authorization-serverでauthTypeがAPI_KEYの場合は404を返す", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-authorization-server/mcp/api-key-server",
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(404);
      expect(body.error).toStrictEqual("oauth_not_supported");
    });

    test("oauth-protected-resourceでauthTypeがAPI_KEYの場合は404を返す", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-protected-resource/mcp/api-key-server",
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(404);
      expect(body.error).toStrictEqual("oauth_not_supported");
    });
  });

  describe("インスタンス固有エンドポイントの正常系", () => {
    test("oauth-authorization-serverで既存OAuthサーバーのメタデータを返す", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-authorization-server/mcp/existing-server",
      );

      expect(res.status).toStrictEqual(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.issuer).toStrictEqual("https://mcp-proxy.example.com");
      expect(body.token_endpoint).toStrictEqual(
        "https://mcp-proxy.example.com/oauth/token",
      );
      expect(body.registration_endpoint).toStrictEqual(
        "https://mcp-proxy.example.com/oauth/register",
      );
      expect(body.code_challenge_methods_supported).toStrictEqual(["S256"]);
    });

    test("oauth-protected-resourceで既存OAuthサーバーのメタデータを返す", async () => {
      const res = await wellKnownRoute.request(
        "/oauth-protected-resource/mcp/existing-server",
      );

      expect(res.status).toStrictEqual(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.resource).toBeDefined();
      expect((body.authorization_servers as string[])[0]).toStrictEqual(
        "https://mcp-proxy.example.com",
      );
      expect(body.bearer_methods_supported).toStrictEqual(["header"]);
    });
  });

  describe("インスタンス固有KEYCLOAK_ISSUER未設定", () => {
    test("oauth-authorization-serverでKEYCLOAK_ISSUERが未設定の場合はエラーを返す", async () => {
      vi.stubEnv("KEYCLOAK_ISSUER", "");

      const res = await wellKnownRoute.request(
        "/oauth-authorization-server/mcp/existing-server",
      );
      const body = (await res.json()) as { error: string };

      expect(res.status).toStrictEqual(500);
      expect(body.error).toStrictEqual("server_misconfiguration");
    });
  });
});
