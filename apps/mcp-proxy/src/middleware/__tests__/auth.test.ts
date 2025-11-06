import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { integratedAuthMiddleware } from "../auth/integrated.js";
import type { HonoEnv } from "../../types/index.js";

// モックの設定
vi.mock("../auth/jwt.js", () => ({
  devKeycloakAuth: vi.fn(async (c: Context<HonoEnv>) => {
    // モック JWT ペイロード
    c.set("jwtPayload", {
      sub: "test-user-id",
      azp: "test-client-id",
      scope: "mcp:access:*",
      organization_id: "test-org-id",
    });
    // next() は integratedAuthMiddleware が呼び出す
  }),
}));

vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpApiKey: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

describe("integratedAuthMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.use("*", integratedAuthMiddleware);
    app.get("/test", (c) => {
      const authInfo = c.get("authInfo");
      return c.json({ authInfo });
    });
    vi.clearAllMocks();
  });

  describe("JWT認証", () => {
    test("有効なJWTトークンで認証成功", async () => {
      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { authInfo: unknown };
      expect(body.authInfo).toStrictEqual({
        organizationId: "test-org-id",
        mcpServerInstanceId: "jwt-instance",
        apiKeyId: "jwt-api-key",
        apiKey: "jwt-token",
      });
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
          code: -32600,
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
          code: -32600,
          message: "Invalid or expired JWT token",
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
        userMcpServerInstanceId: "instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        userMcpServerInstance: {
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
        authInfo: { organizationId: string };
      };
      expect(body.authInfo.organizationId).toBe("org-id");
    });

    test("X-API-Key ヘッダーで認証を試行", async () => {
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "test-key",
        apiKey: "test-api-key",
        apiKeyHash: null,
        userMcpServerInstanceId: "instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        userMcpServerInstance: {
          organizationId: "org-id-2",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        scopes: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const res = await app.request("/test", {
        headers: {
          "X-API-Key": "test-api-key",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        authInfo: { organizationId: string };
      };
      expect(body.authInfo.organizationId).toBe("org-id-2");
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
          code: -32600,
          message: "Authentication required",
          data: {
            hint: "Provide JWT token (Bearer eyJ...) or API key (Bearer tumiki_... or X-API-Key header)",
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
      const res = await app.request("/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        authInfo: { mcpServerInstanceId: string };
      };
      // JWT 認証の結果を確認
      expect(body.authInfo.mcpServerInstanceId).toBe("jwt-instance");
    });

    test("Bearer tumiki_ で始まる場合はAPIキー認証を使用", async () => {
      const { db } = await import("@tumiki/db/server");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      vi.mocked(db.mcpApiKey.findUnique).mockResolvedValueOnce({
        id: "api-key-id",
        name: "test-key",
        apiKey: "tumiki_test",
        apiKeyHash: null,
        userMcpServerInstanceId: "api-instance-id",
        userId: "user-id",
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        userMcpServerInstance: {
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
        authInfo: { mcpServerInstanceId: string };
      };
      // API Key 認証の結果を確認
      expect(body.authInfo.mcpServerInstanceId).toBe("api-instance-id");
    });
  });
});
