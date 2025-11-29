import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { wellKnownRoute } from "../wellKnown.js";

// モックの設定
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

describe("GET /.well-known/oauth-authorization-server/mcp/:devInstanceId", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;
  let originalDevMode: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.route("/.well-known", wellKnownRoute);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;
    originalDevMode = process.env.DEV_MODE;

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

    if (originalDevMode !== undefined) {
      process.env.DEV_MODE = originalDevMode;
    } else {
      delete process.env.DEV_MODE;
    }
  });

  describe("DEV_MODE=true の場合", () => {
    beforeEach(() => {
      process.env.DEV_MODE = "true";
    });

    test("認証なしで302リダイレクトを返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
        {
          method: "GET",
          redirect: "manual", // リダイレクトを手動処理
        },
      );

      expect(res.status).toBe(302);
    });

    test("Keycloak の OpenID Configuration にリダイレクトする", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
        {
          method: "GET",
          redirect: "manual",
        },
      );

      const location = res.headers.get("Location");
      expect(location).toBe(
        "https://keycloak.example.com/realms/tumiki/.well-known/openid-configuration",
      );
    });

    test("パスパラメータ devInstanceId を受け取る", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/test-instance-123",
        {
          method: "GET",
          redirect: "manual",
        },
      );

      // DEV_MODE では instance ID に関わらずリダイレクトが成功する
      expect(res.status).toBe(302);
    });

    test("Authorization ヘッダーなしでアクセスできる（認証不要）", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
        {
          method: "GET",
          redirect: "manual",
        },
      );

      expect(res.status).toBe(302);
    });

    test("Authorization ヘッダーがあっても無視される", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer invalid-token",
          },
          redirect: "manual",
        },
      );

      // 認証エラーにならず、リダイレクトする
      expect(res.status).toBe(302);
    });
  });

  describe("DEV_MODE=false の場合", () => {
    beforeEach(() => {
      process.env.DEV_MODE = "false";
    });

    test("501 Not Implemented を返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(501);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "not_implemented",
        error_description:
          "Instance-specific OAuth authorization server metadata is not yet implemented",
      });
    });
  });

  describe("DEV_MODE未設定の場合", () => {
    beforeEach(() => {
      delete process.env.DEV_MODE;
    });

    test("501 Not Implemented を返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(501);
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(() => {
      process.env.DEV_MODE = "true";
    });

    test("KEYCLOAK_ISSUER が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

      const res = await app.request(
        "/.well-known/oauth-authorization-server/mcp/dev-mcp-instance-id",
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

describe("GET /.well-known/oauth-protected-resource/mcp/:devInstanceId", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;
  let originalMcpResourceUrl: string | undefined;
  let originalDevMode: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.route("/.well-known", wellKnownRoute);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;
    originalMcpResourceUrl = process.env.MCP_RESOURCE_URL;
    originalDevMode = process.env.DEV_MODE;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";
    process.env.MCP_RESOURCE_URL = "http://localhost:8080/mcp";

    vi.clearAllMocks();
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

    if (originalDevMode !== undefined) {
      process.env.DEV_MODE = originalDevMode;
    } else {
      delete process.env.DEV_MODE;
    }
  });

  describe("DEV_MODE=true の場合", () => {
    beforeEach(() => {
      process.env.DEV_MODE = "true";
    });

    describe("RFC 9728 準拠のメタデータ", () => {
      test("認証なしで200とメタデータを返す", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
          {
            method: "GET",
          },
        );

        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;

        // RFC 9728 必須フィールド
        expect(body).toHaveProperty("resource");
        expect(body).toHaveProperty("authorization_servers");

        // 値の検証（instance ID を含む）
        expect(body.resource).toBe(
          "http://localhost:8080/mcp/dev-mcp-instance-id",
        );
        expect(body.authorization_servers).toStrictEqual([
          "https://keycloak.example.com/realms/tumiki",
        ]);
      });

      test("推奨フィールドを含む完全なメタデータを返す", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
          {
            method: "GET",
          },
        );

        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;

        // RFC 9728 推奨フィールド
        expect(body).toHaveProperty("scopes_supported");
        expect(body).toHaveProperty("bearer_methods_supported");
        expect(body).toHaveProperty("resource_documentation");
        expect(body).toHaveProperty("resource_signing_alg_values_supported");

        // 値の検証
        expect(body.scopes_supported).toStrictEqual(["mcp:access"]);
        expect(body.bearer_methods_supported).toStrictEqual(["header"]);
        expect(body.resource_documentation).toBe(
          "https://docs.tumiki.cloud/mcp",
        );
        expect(body.resource_signing_alg_values_supported).toStrictEqual([
          "RS256",
        ]);
      });

      test("Authorization ヘッダーなしでアクセスできる（認証不要）", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
          {
            method: "GET",
            // Authorization ヘッダーなし
          },
        );

        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body).toHaveProperty("authorization_servers");
      });

      test("Authorization ヘッダーがあっても無視される", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer invalid-token",
            },
          },
        );

        // 認証エラーにならず、メタデータを返す
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body).toHaveProperty("authorization_servers");
      });

      test("パスパラメータの値を resource に反映する", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/some-other-instance",
          {
            method: "GET",
          },
        );

        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;

        // パスパラメータの値が resource に反映される
        expect(body.resource).toBe(
          "http://localhost:8080/mcp/some-other-instance",
        );
      });
    });

    describe("メタデータの構造検証", () => {
      test("authorization_servers は配列である", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
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

      test("scopes_supported は配列である", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
          {
            method: "GET",
          },
        );

        const body = (await res.json()) as Record<string, unknown>;
        expect(Array.isArray(body.scopes_supported)).toBe(true);
        expect(body.scopes_supported).toContain("mcp:access");
      });

      test("bearer_methods_supported は配列である", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
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
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
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
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
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

      test("Keycloak Issuer URL が authorization_servers に含まれる", async () => {
        const res = await app.request(
          "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
          {
            method: "GET",
          },
        );

        const body = (await res.json()) as Record<string, unknown>;
        expect(body.authorization_servers).toContain(
          "https://keycloak.example.com/realms/tumiki",
        );
      });
    });
  });

  describe("DEV_MODE=false の場合", () => {
    beforeEach(() => {
      process.env.DEV_MODE = "false";
    });

    test("501 Not Implemented を返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(501);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toStrictEqual({
        error: "not_implemented",
        error_description:
          "Instance-specific OAuth protected resource metadata is not yet implemented",
      });
    });
  });

  describe("DEV_MODE未設定の場合", () => {
    beforeEach(() => {
      delete process.env.DEV_MODE;
    });

    test("501 Not Implemented を返す", async () => {
      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(501);
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(() => {
      process.env.DEV_MODE = "true";
    });

    test("KEYCLOAK_ISSUER が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

      const res = await app.request(
        "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
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
        "/.well-known/oauth-protected-resource/mcp/dev-mcp-instance-id",
        {
          method: "GET",
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;

      // デフォルト値が使用されることを確認（+ instance ID）
      expect(body.resource).toBe(
        "http://localhost:8080/mcp/dev-mcp-instance-id",
      );
      expect(body).toHaveProperty("authorization_servers");
    });
  });
});
