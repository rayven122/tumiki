import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type {
  HonoEnv,
  AuthContext,
} from "../../../../../shared/types/honoEnv.js";

// レスポンスボディの型定義（JSON-RPC 2.0 エラー形式）
type ErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type SuccessResponse = {
  success: boolean;
  authContext: AuthContext;
};

// @tumiki/db のモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpApiKey: {
      findUnique: vi.fn(),
    },
  },
  AuthType: {
    NONE: "NONE",
    API_KEY: "API_KEY",
    OAUTH: "OAUTH",
  },
}));

// logger のモック
vi.mock("../../../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
}));

import { apiKeyAuthMiddleware } from "../apiKeyAuth.js";
import { db, AuthType } from "@tumiki/db/server";

// モック関数を取得
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockFindUnique = vi.mocked(db.mcpApiKey.findUnique);

describe("apiKeyAuthMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();

    // テスト用のHonoアプリを作成（パスパラメータをslugに変更）
    app = new Hono<HonoEnv>();
    app.use("/:slug/*", apiKeyAuthMiddleware);
    app.get("/:slug/test", (c) => {
      const authContext = c.get("authContext");
      return c.json({ success: true, authContext });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("APIキーの検証", () => {
    test("APIキーがない場合は401を返す", async () => {
      const res = await app.request("/my-server/test");

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("API key is required");
    });

    test("Tumiki-API-Keyヘッダーで認証できる", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_test_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_test_key" },
      });

      expect(res.status).toBe(200);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: "tumiki_test_key" },
        include: {
          mcpServer: {
            select: {
              id: true,
              slug: true,
              organizationId: true,
              piiMaskingMode: true,
              piiInfoTypes: true,
              toonConversionEnabled: true,
            },
          },
        },
      });
    });

    test("Authorization Bearerヘッダーで認証できる", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_bearer_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { Authorization: "Bearer tumiki_bearer_key" },
      });

      expect(res.status).toBe(200);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: "tumiki_bearer_key" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        include: expect.any(Object),
      });
    });

    test("Tumiki-API-KeyヘッダーがAuthorizationより優先される", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_priority_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: {
          "Tumiki-API-Key": "tumiki_priority_key",
          Authorization: "Bearer tumiki_other_key",
        },
      });

      expect(res.status).toBe(200);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: "tumiki_priority_key" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        include: expect.any(Object),
      });
    });
  });

  describe("APIキーの有効性検証", () => {
    test("無効なAPIキーの場合は401を返す", async () => {
      mockFindUnique.mockResolvedValue(null);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "invalid_key" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Invalid or inactive API key");
    });

    test("非アクティブなAPIキーの場合は401を返す", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_inactive_key",
        isActive: false,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_inactive_key" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Invalid or inactive API key");
    });

    test("mcpServerがnullの場合は401を返す", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_orphan_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: null,
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_orphan_key" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Invalid or inactive API key");
    });
  });

  describe("APIキーの有効期限検証", () => {
    test("期限切れのAPIキーの場合は401を返す", async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // 昨日

      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_expired_key",
        isActive: true,
        expiresAt: expiredDate,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_expired_key" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("API key has expired");
    });

    test("有効期限内のAPIキーは認証成功する", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30日後

      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_valid_key",
        isActive: true,
        expiresAt: futureDate,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_valid_key" },
      });

      expect(res.status).toBe(200);
    });

    test("有効期限がnullのAPIキーは認証成功する", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_no_expiry_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_no_expiry_key" },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("slug不一致の検証", () => {
    test("APIキーのmcpServer.slugとパスのslugが不一致の場合は403を返す", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_test_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "different-server",
          organizationId: "org-789",
          piiMaskingMode: "DISABLED",
          piiInfoTypes: [],
          toonConversionEnabled: false,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_test_key" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("MCP Server slug/ID mismatch");
    });
  });

  describe("認証成功", () => {
    test("認証成功時にauthContextが正しく設定される", async () => {
      mockFindUnique.mockResolvedValue({
        id: "api-key-id-123",
        apiKey: "tumiki_success_key",
        isActive: true,
        expiresAt: null,
        userId: "user-456",
        mcpServer: {
          id: "server-123",
          slug: "my-server",
          organizationId: "org-789",
          piiMaskingMode: "BOTH",
          piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
          toonConversionEnabled: true,
        },
      } as never);

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_success_key" },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as SuccessResponse;
      expect(body.authContext).toStrictEqual({
        authMethod: AuthType.API_KEY,
        organizationId: "org-789",
        userId: "user-456",
        mcpServerId: "server-123", // 実際のIDがauthContextに設定される
        mcpApiKeyId: "api-key-id-123",
        piiMaskingMode: "BOTH",
        piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
        toonConversionEnabled: true,
      });
    });
  });

  describe("slugパラメータの検証", () => {
    test("slugがパスに存在しない場合は403を返す", async () => {
      // slugパラメータがないルートを作成
      const appNoParam = new Hono<HonoEnv>();
      appNoParam.use("/*", apiKeyAuthMiddleware);
      appNoParam.get("/test", (c) => c.json({ success: true }));

      const res = await appNoParam.request("/test", {
        headers: { "Tumiki-API-Key": "tumiki_test_key" },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("slug or ID is required in path");
    });
  });

  describe("データベースエラー", () => {
    test("データベースエラー時はAPIキーが無効として扱われる", async () => {
      mockFindUnique.mockRejectedValue(new Error("Database connection failed"));

      const res = await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_test_key" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Invalid or inactive API key");
    });

    test("データベースエラー時にlogErrorが呼ばれる", async () => {
      const { logError } =
        await import("../../../../../shared/logger/index.js");
      const dbError = new Error("Database connection failed");
      mockFindUnique.mockRejectedValue(dbError);

      await app.request("/my-server/test", {
        headers: { "Tumiki-API-Key": "tumiki_test_key" },
      });

      expect(logError).toHaveBeenCalledWith(
        "Failed to fetch API key from database",
        dbError,
      );
    });
  });
});
