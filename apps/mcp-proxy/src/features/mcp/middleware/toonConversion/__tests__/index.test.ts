import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type {
  HonoEnv,
  AuthContext,
} from "../../../../../shared/types/honoEnv.js";
import { AuthType, PiiMaskingMode } from "@tumiki/db/server";

// toonConversion のモック
vi.mock("../../../../../infrastructure/toonConversion/index.js", () => ({
  convertMcpResponseToToonSafe: vi.fn(),
}));

// context のモック
vi.mock("../../requestLogging/context.js", () => ({
  getExecutionContext: vi.fn(),
  updateExecutionContext: vi.fn(),
}));

// logger のモック
vi.mock("../../../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
}));

import { toonConversionMiddleware } from "../index.js";
import { convertMcpResponseToToonSafe } from "../../../../../infrastructure/toonConversion/index.js";
import {
  getExecutionContext,
  updateExecutionContext,
} from "../../requestLogging/context.js";

// モック関数を取得
const mockConvertMcpResponseToToonSafe = vi.mocked(
  convertMcpResponseToToonSafe,
);
const mockGetExecutionContext = vi.mocked(getExecutionContext);
const mockUpdateExecutionContext = vi.mocked(updateExecutionContext);

// テスト用のAuthContext生成ヘルパー
const createAuthContext = (
  overrides: Partial<AuthContext> = {},
): AuthContext => ({
  authMethod: AuthType.OAUTH,
  organizationId: "org-123",
  userId: "user-456",
  mcpServerId: "server-789",
  piiMaskingMode: PiiMaskingMode.DISABLED,
  piiInfoTypes: [],
  toonConversionEnabled: false,
  ...overrides,
});

describe("toonConversionMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装
    mockGetExecutionContext.mockReturnValue({
      method: "tools/call",
      requestStartTime: Date.now(),
      inputBytes: 100,
    });

    mockConvertMcpResponseToToonSafe.mockReturnValue({
      convertedData: '{"jsonrpc":"2.0","result":{"toon":"converted"},"id":1}',
      wasConverted: true,
      inputTokens: 100,
      outputTokens: 50,
    });

    // テスト用のHonoアプリを作成
    app = new Hono<HonoEnv>();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("TOON変換の条件", () => {
    test("toonConversionEnabledがfalseの場合はスキップする", async () => {
      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: false }),
        );
        return c.json({ result: "original" });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({ result: "original" });
      expect(mockConvertMcpResponseToToonSafe).not.toHaveBeenCalled();
    });

    test("authContextがない場合はスキップする", async () => {
      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        // authContextをセットしない
        return c.json({ result: "original" });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      expect(mockConvertMcpResponseToToonSafe).not.toHaveBeenCalled();
    });

    test("tools/call以外のメソッドはスキップする", async () => {
      mockGetExecutionContext.mockReturnValue({
        method: "tools/list",
        requestStartTime: Date.now(),
        inputBytes: 100,
      });

      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        return c.json({ result: "original" });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      expect(mockConvertMcpResponseToToonSafe).not.toHaveBeenCalled();
    });

    test("executionContextがundefinedの場合はスキップする", async () => {
      mockGetExecutionContext.mockReturnValue(undefined);

      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        return c.json({ result: "original" });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      expect(mockConvertMcpResponseToToonSafe).not.toHaveBeenCalled();
    });
  });

  describe("TOON変換の実行", () => {
    test("条件を満たす場合はTOON変換を実行する", async () => {
      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        return c.json({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: "original" }] },
          id: 1,
        });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      expect(mockConvertMcpResponseToToonSafe).toHaveBeenCalled();
    });

    test("変換結果がレスポンスに反映される", async () => {
      mockConvertMcpResponseToToonSafe.mockReturnValue({
        convertedData: '{"converted":true}',
        wasConverted: true,
        inputTokens: 100,
        outputTokens: 30,
      });

      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        return c.json({ original: true });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({ converted: true });
    });

    test("トークン数がコンテキストに保存される", async () => {
      mockConvertMcpResponseToToonSafe.mockReturnValue({
        convertedData: '{"result":"toon"}',
        wasConverted: true,
        inputTokens: 200,
        outputTokens: 80,
      });

      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        return c.json({ data: "test" });
      });

      await app.request("/test");

      // toonConversionEnabled の更新
      expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
        toonConversionEnabled: true,
      });

      // トークン数の更新
      expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
        inputTokens: 200,
        outputTokens: 80,
      });
    });
  });

  describe("エラーハンドリング", () => {
    test("変換エラー時は元のレスポンスを返す（フェイルオープン）", async () => {
      mockConvertMcpResponseToToonSafe.mockImplementation(() => {
        throw new Error("Conversion failed");
      });

      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        return c.json({ original: "data" });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({ original: "data" });
    });
  });

  describe("レスポンスヘッダーの保持", () => {
    test("元のレスポンスのステータスを保持する", async () => {
      mockConvertMcpResponseToToonSafe.mockReturnValue({
        convertedData: '{"error":"bad request"}',
        wasConverted: true,
        inputTokens: 50,
        outputTokens: 20,
      });

      app.use("/*", toonConversionMiddleware);
      app.get("/test", (c) => {
        c.set(
          "authContext",
          createAuthContext({ toonConversionEnabled: true }),
        );
        c.status(400);
        return c.json({ error: "bad request" });
      });

      const res = await app.request("/test");

      expect(res.status).toBe(400);
    });
  });
});
