import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type {
  HonoEnv,
  AuthContext,
} from "../../../../../shared/types/honoEnv.js";

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
vi.mock("../../../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// pubsub のモック
vi.mock("../../../../../infrastructure/pubsub/mcpLogger.js", () => ({
  publishMcpLog: vi.fn(),
}));

// utils のモック
vi.mock("../../../../../shared/utils/byteLength.js", () => ({
  byteLength: vi.fn().mockReturnValue(100),
}));

vi.mock("../../../../../shared/utils/tokenCount.js", () => ({
  countTokens: vi.fn().mockReturnValue(50),
}));

import { mcpRequestLoggingMiddleware } from "../index.js";
import { runWithExecutionContext, getExecutionContext } from "../context.js";
import { db, AuthType, PiiMaskingMode } from "@tumiki/db/server";
import { publishMcpLog } from "../../../../../infrastructure/pubsub/mcpLogger.js";
import { logError } from "../../../../../shared/logger/index.js";

// モック関数を取得
const mockRunWithExecutionContext = vi.mocked(runWithExecutionContext);
const mockGetExecutionContext = vi.mocked(getExecutionContext);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockCreate = vi.mocked(db.mcpServerRequestLog.create);
const mockPublishMcpLog = vi.mocked(publishMcpLog);
const mockLogError = vi.mocked(logError);

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
        authMethod: AuthType.OAUTH,
        organizationId: "org-123",
        userId: "user-456",
        mcpServerId: "server-789",
        piiMaskingMode: PiiMaskingMode.DISABLED,
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

  describe("logMcpServerRequest", () => {
    test("DB作成が失敗した場合、エラーをログに記録してnullを返す", async () => {
      // DB作成が失敗するようにモック
      mockCreate.mockRejectedValueOnce(new Error("DB connection failed"));

      await app.request("/test");

      // 非同期処理が完了するまで待つ
      await vi.waitFor(() => {
        expect(mockLogError).toHaveBeenCalledWith(
          "Failed to log MCP server request",
          expect.any(Error),
          expect.objectContaining({
            mcpServerId: "server-789",
          }),
        );
      });

      // publishMcpLog は DB 失敗後でも呼ばれる（postgresLogFailed: true）
      await vi.waitFor(() => {
        expect(mockPublishMcpLog).toHaveBeenCalledWith(
          expect.objectContaining({
            postgresLogFailed: true,
          }),
        );
      });
    });
  });

  describe("authContextの検証", () => {
    test("authContextがnullの場合、ログ記録処理をスキップする", async () => {
      // authContextを設定しないエンドポイント
      const appNoAuth = new Hono<HonoEnv>();
      appNoAuth.use("/*", mcpRequestLoggingMiddleware);
      appNoAuth.get("/no-auth", (c) => c.json({ success: true }));

      // getExecutionContextがtoolNameを含むコンテキストを返すように設定
      mockGetExecutionContext.mockReturnValue({
        requestStartTime: Date.now() - 100,
        inputBytes: 100,
        toolName: "test-tool",
        method: "tools/call",
      });

      await appNoAuth.request("/no-auth");

      // 非同期処理が完了するのを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      // authContextがないためDB作成もPub/Subも呼ばれない
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockPublishMcpLog).not.toHaveBeenCalled();
    });
  });

  describe("PII検出情報の計算", () => {
    test("piiDetectedRequestとpiiDetectedResponseからカウントとInfoTypeを計算する", async () => {
      mockGetExecutionContext.mockReturnValue({
        requestStartTime: Date.now() - 100,
        inputBytes: 100,
        toolName: "test-tool",
        method: "tools/call",
        transportType: "STREAMABLE_HTTPS",
        requestBody: { jsonrpc: "2.0", method: "tools/call", id: 1 },
        piiMaskingMode: "BOTH",
        piiDetectedRequest: [
          { infoType: "PHONE_NUMBER", count: 3 },
          { infoType: "EMAIL_ADDRESS", count: 2 },
        ],
        piiDetectedResponse: [
          { infoType: "PHONE_NUMBER", count: 1 },
          { infoType: "CREDIT_CARD_NUMBER", count: 4 },
        ],
      });

      await app.request("/test");

      // 非同期処理が完了するまで待つ
      await vi.waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            piiMaskingMode: "BOTH",
            piiDetectedRequestCount: 5, // 3 + 2
            piiDetectedResponseCount: 5, // 1 + 4
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            piiDetectedInfoTypes: expect.arrayContaining([
              "PHONE_NUMBER",
              "EMAIL_ADDRESS",
              "CREDIT_CARD_NUMBER",
            ]),
          }),
        });
      });

      // BigQuery送信にはInfoType別の詳細が含まれる
      await vi.waitFor(() => {
        expect(mockPublishMcpLog).toHaveBeenCalledWith(
          expect.objectContaining({
            piiDetectionDetailsRequest: {
              PHONE_NUMBER: 3,
              EMAIL_ADDRESS: 2,
            },
            piiDetectionDetailsResponse: {
              PHONE_NUMBER: 1,
              CREDIT_CARD_NUMBER: 4,
            },
          }),
        );
      });
    });
  });

  describe("レスポンスボディのJSONパース失敗", () => {
    test("レスポンスがJSON以外の場合はテキストとして扱う", async () => {
      // JSON以外のレスポンスを返すエンドポイント
      const appText = new Hono<HonoEnv>();
      appText.use("/*", mcpRequestLoggingMiddleware);
      appText.get("/text", (c) => {
        const authContext: AuthContext = {
          authMethod: AuthType.OAUTH,
          organizationId: "org-123",
          userId: "user-456",
          mcpServerId: "server-789",
          piiMaskingMode: PiiMaskingMode.DISABLED,
          piiInfoTypes: [],
          toonConversionEnabled: false,
        };
        c.set("authContext", authContext);
        return c.text("This is not JSON");
      });

      await appText.request("/text");

      // 非同期処理が完了するまで待つ
      await vi.waitFor(() => {
        expect(mockPublishMcpLog).toHaveBeenCalledWith(
          expect.objectContaining({
            // レスポンスボディがテキストとして渡される
            responseBody: "This is not JSON",
          }),
        );
      });
    });
  });

  describe("requestStartTimeがfalsyの場合", () => {
    test("requestStartTimeが0の場合はdurationMsが0になる", async () => {
      mockGetExecutionContext.mockReturnValue({
        requestStartTime: 0,
        inputBytes: 100,
        toolName: "test-tool",
        method: "tools/call",
        transportType: "STREAMABLE_HTTPS",
        requestBody: { jsonrpc: "2.0", method: "tools/call", id: 1 },
      });

      await app.request("/test");

      // 非同期処理が完了するまで待つ
      await vi.waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            durationMs: 0,
          }),
        });
      });
    });
  });

  describe("レスポンステキスト取得", () => {
    test("recordRequestLogAsyncがレスポンスのclone().text()でレスポンスボディを取得する", async () => {
      // recordRequestLogAsyncの完了を追跡するためにpublishMcpLogの呼び出しを待つ
      const publishPromise = new Promise<void>((resolve) => {
        mockPublishMcpLog.mockImplementation(async () => {
          resolve();
        });
      });

      await app.request("/test");

      // recordRequestLogAsyncが完了するまで待つ
      await publishPromise;

      // publishMcpLogにresponseBodyとしてJSONパース結果が渡される
      expect(mockPublishMcpLog).toHaveBeenCalledWith(
        expect.objectContaining({
          responseBody: { success: true },
        }),
      );
    });

    test("requestBodyが未設定の場合はc.req.json()からボディを取得する", async () => {
      // requestBodyを含まないコンテキストを設定
      mockGetExecutionContext.mockReturnValue({
        requestStartTime: Date.now() - 100,
        inputBytes: 100,
        toolName: "test-tool",
        method: "tools/call",
        transportType: "STREAMABLE_HTTPS",
        // requestBodyなし - c.req.json()からフォールバック
      });

      const publishPromise = new Promise<void>((resolve) => {
        mockPublishMcpLog.mockImplementation(async () => {
          resolve();
        });
      });

      // POSTリクエストでJSONボディを送信
      const appPost = new Hono<HonoEnv>();
      appPost.use("/*", mcpRequestLoggingMiddleware);
      appPost.post("/test-post", (c) => {
        const authContext: AuthContext = {
          authMethod: AuthType.OAUTH,
          organizationId: "org-123",
          userId: "user-456",
          mcpServerId: "server-789",
          piiMaskingMode: PiiMaskingMode.DISABLED,
          piiInfoTypes: [],
          toonConversionEnabled: false,
        };
        c.set("authContext", authContext);
        return c.json({ result: "ok" });
      });

      await appPost.request("/test-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", id: 1 }),
      });

      await publishPromise;

      // レスポンスボディが正しく取得されている
      expect(mockPublishMcpLog).toHaveBeenCalledWith(
        expect.objectContaining({
          responseBody: { result: "ok" },
        }),
      );
    });
  });

  describe("デフォルト値のフォールバック", () => {
    test("transportTypeとmethodが未設定の場合はデフォルト値を使用する", async () => {
      // transportTypeとmethodを含まないコンテキスト
      mockGetExecutionContext.mockReturnValue({
        requestStartTime: Date.now() - 100,
        inputBytes: 100,
        toolName: "test-tool",
        requestBody: { jsonrpc: "2.0", method: "tools/call", id: 1 },
        // transportType と method を省略
      });

      await app.request("/test");

      await vi.waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            transportType: "STREAMABLE_HTTPS",
            method: "tools/call",
          }),
        });
      });
    });
  });

  describe("logMcpServerRequestのcatchパス", () => {
    test("logMcpServerRequestのPromiseが拒否された場合、外側のcatchでエラーをログ記録する", async () => {
      // mockCreateを同期的にエラーをスローするように設定
      // logMcpServerRequest内でtry/catchされるが、
      // その結果のPromise.catch()も呼ばれることを確認
      mockCreate.mockImplementation(() => {
        throw new Error("Synchronous DB error");
      });

      await app.request("/test");

      // 非同期処理が完了するまで待つ
      await vi.waitFor(() => {
        // logMcpServerRequest内のcatchでlogErrorが呼ばれる
        expect(mockLogError).toHaveBeenCalledWith(
          "Failed to log MCP server request",
          expect.any(Error),
          expect.objectContaining({
            mcpServerId: "server-789",
          }),
        );
      });
    });

    test("logMcpServerRequest内のcatchブロックでエラーが発生した場合、外側の.catch()でエラーをログ記録する", async () => {
      // mockCreateがエラーをスローし、内側のcatchブロック内のlogErrorも
      // エラーをスローするように設定して、logMcpServerRequest自体が
      // 拒否されるPromiseを返す状況を作る（lines 172-181のcatchパス）
      mockCreate.mockRejectedValue(new Error("DB error"));
      mockLogError.mockImplementation((message: string) => {
        if (message === "Failed to log MCP server request") {
          throw new Error("logError itself failed");
        }
      });

      await app.request("/test");

      // 非同期処理が完了するまで待つ
      await vi.waitFor(() => {
        // 外側の.catch()でlogErrorが呼ばれる（lines 172-179）
        expect(mockLogError).toHaveBeenCalledWith(
          "Failed to log MCP server request in middleware",
          expect.any(Error),
          expect.objectContaining({
            toolName: "test-tool",
            mcpServerId: "server-789",
          }),
        );
      });
    });
  });
});
