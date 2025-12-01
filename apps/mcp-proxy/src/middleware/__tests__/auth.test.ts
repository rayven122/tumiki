import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { integratedAuthMiddleware } from "../auth/index.js";
import type { HonoEnv } from "../../types/index.js";

// モックの設定
vi.mock("../auth/jwt.js", () => ({
  devKeycloakAuth: vi.fn(async (c: Context<HonoEnv>) => {
    // モック JWT ペイロード（tumiki ネスト構造）
    c.set("jwtPayload", {
      sub: "test-user-id",
      azp: "test-client-id",
      scope: "mcp:access:*",
      tumiki: {
        org_id: "test-org-id",
        is_org_admin: true,
        tumiki_user_id: "test-user-db-id",
        mcp_instance_id: "test-mcp-instance-id",
      },
    });
    // next() は integratedAuthMiddleware が呼び出す
  }),
}));

vi.mock("@tumiki/db/server", () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
    },
    mcpApiKey: {
      findUnique: vi.fn(),
    },
    mcpServer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("../../services/permissionService.js", () => ({
  checkPermission: vi.fn(),
}));

describe("integratedAuthMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(async () => {
    app = new Hono<HonoEnv>();
    app.use("*", integratedAuthMiddleware);
    app.get("/test", (c) => {
      const jwtPayload = c.get("jwtPayload");
      const apiKeyAuthInfo = c.get("apiKeyAuthInfo");
      return c.json({ jwtPayload, apiKeyAuthInfo });
    });
    vi.clearAllMocks();

    // checkPermission のモックをリセット
    const { checkPermission } = await import(
      "../../services/permissionService.js"
    );
    vi.mocked(checkPermission).mockResolvedValue(true);
  });

  describe("JWT認証", () => {
    test("有効なJWTトークンで認証成功", async () => {
      // instanceResolver で使用される DB モックを設定
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpServer.findUnique).mockResolvedValueOnce({
        id: "test-mcp-instance-id",
        name: "Test Instance",
        description: null,
        organizationId: "test-org-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jwtPayload?: unknown;
        apiKeyAuthInfo?: unknown;
      };
      expect(body.jwtPayload).toBeDefined();
      expect(body.apiKeyAuthInfo).toBeUndefined();
    });

    test("JWTペイロードがない場合は401エラー", async () => {
      // devKeycloakAuth がペイロードを設定しない場合をモック
      const { devKeycloakAuth } = await import("../auth/jwt.js");
      vi.mocked(devKeycloakAuth).mockImplementationOnce(
        async (c: Context<HonoEnv>) => {
          // jwtPayload を設定しない
          // next()を呼ばないことで、ペイロードなしをシミュレート
          c.set("jwtPayload", undefined);
        },
      );

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid",
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Invalid JWT token",
        },
      });
    });

    test("JWT認証が例外を投げた場合は401エラー", async () => {
      const { devKeycloakAuth } = await import("../auth/jwt.js");
      vi.mocked(devKeycloakAuth).mockImplementationOnce(async () => {
        throw new Error("JWT verification failed");
      });

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.error",
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Invalid or expired JWT token",
        },
      });
    });

    test("mcp_instance_idがないJWTの場合は401エラー", async () => {
      // mcp_instance_id なしのJWTをモック
      const { devKeycloakAuth } = await import("../auth/jwt.js");
      vi.mocked(devKeycloakAuth).mockImplementationOnce(async (c) => {
        c.set("jwtPayload", {
          sub: "test-user-id",
          azp: "test-client-id",
          scope: "mcp:access:*",
          tumiki: {
            org_id: "test-org-id",
            is_org_admin: true,
            tumiki_user_id: "test-user-db-id",
            // mcp_instance_id なし
          },
        });
      });

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message:
            "mcp_instance_id is required for MCP server access. This JWT is not valid for MCP operations.",
        },
      });
    });

    test("権限チェックが失敗した場合は403エラー", async () => {
      // checkPermission が false を返すようにモック
      const { checkPermission } = await import(
        "../../services/permissionService.js"
      );
      vi.mocked(checkPermission).mockResolvedValueOnce(false);

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32003,
          message: "Permission denied: READ access to MCP_SERVER_INSTANCE",
        },
      });
    });
  });

  describe("APIキー認証", () => {
    test("Bearer tumiki_ 形式のAPIキーで認証を試行", async () => {
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "test-key",
        apiKey: "tumiki_test_key",
        apiKeyHash: null,
        mcpServerId: "instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        mcpServer: {
          organizationId: "org-id",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        scopes: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer tumiki_test_key",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jwtPayload?: unknown;
        apiKeyAuthInfo?: { organizationId: string };
      };
      expect(body.apiKeyAuthInfo).toBeDefined();
      expect(body.apiKeyAuthInfo?.organizationId).toBe("org-id");
      expect(body.jwtPayload).toBeUndefined();
    });

    test("Tumiki-API-Key ヘッダーで認証を試行", async () => {
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "test-key",
        apiKey: "test-api-key",
        apiKeyHash: null,
        mcpServerId: "instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        mcpServer: {
          organizationId: "org-id-2",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        scopes: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          "Tumiki-API-Key": "test-api-key",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jwtPayload?: unknown;
        apiKeyAuthInfo?: { organizationId: string };
      };
      expect(body.apiKeyAuthInfo).toBeDefined();
      expect(body.apiKeyAuthInfo?.organizationId).toBe("org-id-2");
      expect(body.jwtPayload).toBeUndefined();
    });

    test("期限切れのAPIキーで認証失敗", async () => {
      const { db } = await import("@tumiki/db/server");
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 昨日

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "expired-key",
        apiKey: "expired-api-key",
        apiKeyHash: null,
        mcpServerId: "instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: pastDate, // 期限切れ
        mcpServer: {
          organizationId: "org-id",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        scopes: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          "Tumiki-API-Key": "expired-api-key",
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Invalid or inactive API key",
        },
      });
    });

    test("未来の有効期限を持つAPIキーで認証成功", async () => {
      const { db } = await import("@tumiki/db/server");
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30日後

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "valid-key",
        apiKey: "valid-api-key",
        apiKeyHash: null,
        mcpServerId: "instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: futureDate, // 未来の有効期限
        mcpServer: {
          organizationId: "org-id-3",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        scopes: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          "Tumiki-API-Key": "valid-api-key",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jwtPayload?: unknown;
        apiKeyAuthInfo?: { organizationId: string };
      };
      expect(body.apiKeyAuthInfo).toBeDefined();
      expect(body.apiKeyAuthInfo?.organizationId).toBe("org-id-3");
      expect(body.jwtPayload).toBeUndefined();
    });
  });

  describe("認証情報なし", () => {
    test("Authorizationヘッダーなしの場合は401エラー", async () => {
      const res = await app.request("/test");

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Authentication required",
          data: {
            hint: "Provide JWT token (Bearer eyJ...) or API key (Bearer tumiki_... or Tumiki-API-Key header)",
          },
        },
      });
    });

    test("不正な形式のAuthorizationヘッダーの場合は401エラー", async () => {
      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer invalid_format",
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe("Authentication required");
    });
  });

  describe("認証方式の判定", () => {
    test("Bearer eyJ で始まる場合はJWT認証を使用", async () => {
      // instanceResolver で使用される DB モックを設定
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpServer.findUnique).mockResolvedValueOnce({
        id: "test-mcp-instance-id",
        name: "Test Instance",
        description: null,
        organizationId: "test-org-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jwtPayload?: unknown;
        apiKeyAuthInfo?: unknown;
      };
      // JWT 認証の結果を確認
      expect(body.jwtPayload).toBeDefined();
      expect(body.apiKeyAuthInfo).toBeUndefined();
    });

    test("Bearer tumiki_ で始まる場合はAPIキー認証を使用", async () => {
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "test-key",
        apiKey: "tumiki_test",
        apiKeyHash: null,
        mcpServerId: "api-instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        mcpServer: {
          organizationId: "api-org-id",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        scopes: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer tumiki_test",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        jwtPayload?: unknown;
        apiKeyAuthInfo?: { mcpServerInstanceId: string };
      };
      // API Key 認証の結果を確認
      expect(body.apiKeyAuthInfo).toBeDefined();
      expect(body.apiKeyAuthInfo?.mcpServerInstanceId).toBe("api-instance-id");
      expect(body.jwtPayload).toBeUndefined();
    });
  });
});
