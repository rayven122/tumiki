import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv, AuthContext } from "../../../types/index.js";

// context.js のモック
vi.mock("../context.js", () => ({
  runWithExecutionContext: vi.fn(),
  getExecutionContext: vi.fn(),
}));

// @tumiki/db のモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpServerRequestLog: {
      create: vi.fn(),
    },
  },
  AuthType: {
    NONE: "NONE",
    API_KEY: "API_KEY",
    OAUTH: "OAUTH",
  },
  PiiMaskingMode: {
    DISABLED: "DISABLED",
    REQUEST: "REQUEST",
    RESPONSE: "RESPONSE",
    BOTH: "BOTH",
  },
}));

// logger のモック
vi.mock("../../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// pubsub のモック
vi.mock("../../../libs/pubsub/mcpLogger.js", () => ({
  publishMcpLog: vi.fn(),
}));

// utils のモック
vi.mock("../../../utils/index.js", () => ({
  byteLength: vi.fn().mockReturnValue(100),
}));

vi.mock("../../../utils/tokenCount.js", () => ({
  countTokens: vi.fn().mockReturnValue(50),
}));

import { mcpRequestLoggingMiddleware } from "../index.js";
import { runWithExecutionContext, getExecutionContext } from "../context.js";
import { db, AuthType, PiiMaskingMode } from "@tumiki/db/server";
import { publishMcpLog } from "../../../libs/pubsub/mcpLogger.js";

// モック関数を取得
const mockRunWithExecutionContext = vi.mocked(runWithExecutionContext);
const mockGetExecutionContext = vi.mocked(getExecutionContext);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockCreate = vi.mocked(db.mcpServerRequestLog.create);
const mockPublishMcpLog = vi.mocked(publishMcpLog);

describe("mcpRequestLoggingMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();

    // runWithExecutionContext のデフォルト実装
    mockRunWithExecutionContext.mockImplementation(
      async (_context, callback) => {
        return await callback();
      },
    );

    // getExecutionContext のデフォルト実装
    // requestBodyを設定して、c.req.json()の呼び出しを回避
    mockGetExecutionContext.mockReturnValue({
      requestStartTime: Date.now() - 100,
      inputBytes: 100,
      toolName: "test-tool",
      method: "tools/call",
      transportType: "STREAMABLE_HTTPS",
      requestBody: { jsonrpc: "2.0", method: "tools/call", id: 1 },
    });

    // DB作成のデフォルト実装
    mockCreate.mockResolvedValue({ id: "log-id-123" } as never);
    mockPublishMcpLog.mockResolvedValue(undefined);

    // テスト用のHonoアプリを作成
    app = new Hono<HonoEnv>();
    app.use("/*", mcpRequestLoggingMiddleware);
    app.get("/test", (c) => {
      // authContextをセット（認証後の状態をシミュレート）
      const authContext: AuthContext = {
        authMethod: AuthType.OAUTH as AuthContext["authMethod"],
        organizationId: "org-123",
        userId: "user-456",
        mcpServerId: "server-789",
        piiMaskingMode:
          PiiMaskingMode.DISABLED as AuthContext["piiMaskingMode"],
        piiInfoTypes: [],
        toonConversionEnabled: false,
      };
      c.set("authContext", authContext);
      return c.json({ success: true });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("ミドルウェアの基本動作", () => {
    test("リクエストを正常に処理する", async () => {
      const res = await app.request("/test");

      expect(res.status).toBe(200);
    });

    test("runWithExecutionContextでコンテキストをラップする", async () => {
      await app.request("/test");

      expect(mockRunWithExecutionContext).toHaveBeenCalledTimes(1);
      expect(mockRunWithExecutionContext).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          requestStartTime: expect.any(Number),
          inputBytes: 0,
        }),
        expect.any(Function),
      );
    });

    test("初期コンテキストにrequestStartTimeが設定される", async () => {
      const beforeRequest = Date.now();

      await app.request("/test");

      const callArg = mockRunWithExecutionContext.mock.calls[0][0];
      expect(callArg.requestStartTime).toBeGreaterThanOrEqual(beforeRequest);
      expect(callArg.requestStartTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("ログ記録", () => {
    test("authContextがない場合はログを記録しない", async () => {
      // authContextをセットしないエンドポイント
      app = new Hono<HonoEnv>();
      app.use("/*", mcpRequestLoggingMiddleware);
      app.get("/no-auth", (c) => c.json({ success: true }));

      await app.request("/no-auth");

      // DB作成とPub/Sub送信が呼ばれないことを確認
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockPublishMcpLog).not.toHaveBeenCalled();
    });

    test("toolNameがない場合はログを記録しない", async () => {
      mockGetExecutionContext.mockReturnValue({
        requestStartTime: Date.now() - 100,
        inputBytes: 100,
        // toolNameなし
      });

      await app.request("/test");

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockPublishMcpLog).not.toHaveBeenCalled();
    });
  });

  describe("エラーハンドリング", () => {
    test("ハンドラーでエラーが発生してもミドルウェアは例外を投げない", async () => {
      app = new Hono<HonoEnv>();
      app.use("/*", mcpRequestLoggingMiddleware);
      app.get("/error", () => {
        throw new Error("Handler error");
      });

      // ミドルウェア自体は例外を投げない（ハンドラーの例外は別）
      // Honoのデフォルトエラーハンドリングで500が返る
      const res = await app.request("/error");
      expect(res.status).toBe(500);
    });
  });

  describe("コンテキストの分離", () => {
    test("各リクエストが独立したコンテキストを持つ", async () => {
      const contexts: unknown[] = [];

      mockRunWithExecutionContext.mockImplementation(
        async (context, callback) => {
          contexts.push({ ...context });
          return await callback();
        },
      );

      await Promise.all([app.request("/test"), app.request("/test")]);

      expect(contexts).toHaveLength(2);
      // 各コンテキストが独立していることを確認
      expect(contexts[0]).not.toBe(contexts[1]);
    });
  });
});
