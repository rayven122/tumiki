import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../../../../shared/types/honoEnv.js";

// レスポンスボディの型定義（JSON-RPC 2.0 エラー形式）
type ErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: {
      hint?: string;
    };
  };
};

// apiKeyAuth.js のモック
vi.mock("../apiKeyAuth.js", () => ({
  apiKeyAuthMiddleware: vi.fn(),
}));

// jwtAuth.js のモック
vi.mock("../jwtAuth.js", () => ({
  jwtAuthMiddleware: vi.fn(),
}));

// logger のモック
vi.mock("../../../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
}));

import { authMiddleware } from "../index.js";
import { apiKeyAuthMiddleware } from "../apiKeyAuth.js";
import { jwtAuthMiddleware } from "../jwtAuth.js";

// モック関数を取得
const mockApiKeyAuthMiddleware = vi.mocked(apiKeyAuthMiddleware);
const mockJwtAuthMiddleware = vi.mocked(jwtAuthMiddleware);

describe("authMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();

    // テスト用のHonoアプリを作成
    app = new Hono<HonoEnv>();
    app.use("/:mcpServerId/*", authMiddleware);
    app.get("/:mcpServerId/test", (c) => {
      const authMethod = c.get("authMethod");
      return c.json({ success: true, authType: authMethod });
    });

    // デフォルトでミドルウェアは成功するように設定
    mockJwtAuthMiddleware.mockImplementation(async (_c, next) => {
      await next();
    });
    mockApiKeyAuthMiddleware.mockImplementation(async (_c, next) => {
      await next();
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("認証方式の検出", () => {
    test("JWT形式のBearerトークンはJWT認証にルーティングされる", async () => {
      // eyJで始まるBearerトークン
      const res = await app.request("/server-123/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9",
        },
      });

      expect(res.status).toBe(200);
      expect(mockJwtAuthMiddleware).toHaveBeenCalled();
      expect(mockApiKeyAuthMiddleware).not.toHaveBeenCalled();
    });

    test("tumiki_で始まるBearerトークンはAPIキー認証にルーティングされる", async () => {
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer tumiki_test_api_key" },
      });

      expect(res.status).toBe(200);
      expect(mockApiKeyAuthMiddleware).toHaveBeenCalled();
      expect(mockJwtAuthMiddleware).not.toHaveBeenCalled();
    });

    test("Tumiki-API-KeyヘッダーはAPIキー認証にルーティングされる", async () => {
      const res = await app.request("/server-123/test", {
        headers: { "Tumiki-API-Key": "tumiki_header_api_key" },
      });

      expect(res.status).toBe(200);
      expect(mockApiKeyAuthMiddleware).toHaveBeenCalled();
      expect(mockJwtAuthMiddleware).not.toHaveBeenCalled();
    });
  });

  describe("認証情報なし", () => {
    test("認証情報がない場合は401を返す", async () => {
      const res = await app.request("/server-123/test");

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Authentication required");
      expect(body.error.data?.hint).toContain("Bearer eyJ");
      expect(mockJwtAuthMiddleware).not.toHaveBeenCalled();
      expect(mockApiKeyAuthMiddleware).not.toHaveBeenCalled();
    });

    test("空のAuthorizationヘッダーの場合は401を返す", async () => {
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Authentication required");
    });

    test("Bearerでないトークン形式の場合は401を返す", async () => {
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Authentication required");
    });
  });

  describe("エッジケース", () => {
    test("eyJで始まらないBearerトークンは認証エラー", async () => {
      // tumiki_でもeyJでもないBearerトークン
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "Bearer some_random_token" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Authentication required");
    });

    test("Bearer後にスペースがない場合は認証エラー", async () => {
      const res = await app.request("/server-123/test", {
        headers: { Authorization: "BearereyJhbGciOiJSUzI1NiJ9" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error.message).toContain("Authentication required");
    });

    test("JWT認証とAPIキー両方のヘッダーがある場合はJWT認証が優先される", async () => {
      const res = await app.request("/server-123/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9",
          "Tumiki-API-Key": "tumiki_api_key",
        },
      });

      expect(res.status).toBe(200);
      expect(mockJwtAuthMiddleware).toHaveBeenCalled();
      expect(mockApiKeyAuthMiddleware).not.toHaveBeenCalled();
    });
  });

  describe("ミドルウェア呼び出しの確認", () => {
    test("JWT認証ミドルウェアがContextとNextを受け取る", async () => {
      let receivedContext = null;
      let receivedNext = null;

      mockJwtAuthMiddleware.mockImplementation(async (c, next) => {
        receivedContext = c;
        receivedNext = next;
        await next();
      });

      await app.request("/server-123/test", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9",
        },
      });

      expect(receivedContext).not.toBeNull();
      expect(receivedNext).not.toBeNull();
      expect(typeof receivedNext).toBe("function");
    });

    test("APIキー認証ミドルウェアがContextとNextを受け取る", async () => {
      let receivedContext = null;
      let receivedNext = null;

      mockApiKeyAuthMiddleware.mockImplementation(async (c, next) => {
        receivedContext = c;
        receivedNext = next;
        await next();
      });

      await app.request("/server-123/test", {
        headers: { "Tumiki-API-Key": "tumiki_test_key" },
      });

      expect(receivedContext).not.toBeNull();
      expect(receivedNext).not.toBeNull();
      expect(typeof receivedNext).toBe("function");
    });
  });
});
