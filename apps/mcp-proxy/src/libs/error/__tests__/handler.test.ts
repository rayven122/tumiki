/**
 * 共通エラーハンドラーのテスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../../types/index.js";
import { handleError } from "../handler.js";
import * as loggerModule from "../../logger/index.js";

type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: {
      message?: string;
    };
  };
};

vi.mock("../../logger/index.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../logger/index.js")>();
  return {
    ...original,
    logError: vi.fn(),
    sanitizeIdForLog: original.sanitizeIdForLog,
  };
});

describe("handleError", () => {
  const mockLogError = loggerModule.logError as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("JSON-RPC 2.0形式のエラーレスポンスを返す", async () => {
    const app = new Hono<HonoEnv>();

    app.post("/test", (c) => {
      const error = new Error("Test error message");
      return handleError(c, error, {
        requestId: "req-123",
        errorCode: -32603,
        errorMessage: "Internal error",
        organizationId: "org-456",
        instanceId: "instance-789",
        logMessage: "Test error occurred",
      });
    });

    const response = await app.request("/test", { method: "POST" });
    const body = await response.json();

    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: "req-123",
      error: {
        code: -32603,
        message: "Internal error",
        data: {
          message: "Test error message",
        },
      },
    });
  });

  test("requestIdがnullの場合もJSON-RPC形式で返す", async () => {
    const app = new Hono<HonoEnv>();

    app.post("/test", (c) => {
      const error = new Error("Test error");
      return handleError(c, error, {
        requestId: null,
        errorCode: -32600,
        errorMessage: "Invalid request",
        organizationId: "org-123",
        instanceId: "instance-456",
        logMessage: "Invalid request received",
      });
    });

    const response = await app.request("/test", { method: "POST" });
    const body = (await response.json()) as JsonRpcErrorResponse;

    expect(body.id).toBeNull();
  });

  test("requestIdがundefinedの場合はnullに変換される", async () => {
    const app = new Hono<HonoEnv>();

    app.post("/test", (c) => {
      const error = new Error("Test error");
      return handleError(c, error, {
        requestId: undefined,
        errorCode: -32600,
        errorMessage: "Invalid request",
        organizationId: "org-123",
        instanceId: "instance-456",
        logMessage: "Invalid request received",
      });
    });

    const response = await app.request("/test", { method: "POST" });
    const body = (await response.json()) as JsonRpcErrorResponse;

    expect(body.id).toBeNull();
  });

  test("requestIdが数値の場合も正しく処理される", async () => {
    const app = new Hono<HonoEnv>();

    app.post("/test", (c) => {
      const error = new Error("Test error");
      return handleError(c, error, {
        requestId: 42,
        errorCode: -32601,
        errorMessage: "Method not found",
        organizationId: "org-123",
        instanceId: "instance-456",
        logMessage: "Method not found",
      });
    });

    const response = await app.request("/test", { method: "POST" });
    const body = (await response.json()) as JsonRpcErrorResponse;

    expect(body.id).toBe(42);
  });

  test("logErrorが正しい引数で呼び出される", async () => {
    const app = new Hono<HonoEnv>();
    const testError = new Error("Test error message");

    app.post("/test", (c) => {
      return handleError(c, testError, {
        requestId: "req-123",
        errorCode: -32603,
        errorMessage: "Internal error",
        organizationId: "org-456",
        instanceId: "instance-789",
        logMessage: "Error occurred in test",
      });
    });

    await app.request("/test", { method: "POST" });

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(
      "Error occurred in test",
      testError,
      expect.objectContaining({
        organizationId: expect.any(String), // ハッシュ化されている
        instanceId: expect.any(String), // ハッシュ化されている
      }),
    );
  });

  test("additionalMetadataがログに含まれる", async () => {
    const app = new Hono<HonoEnv>();
    const testError = new Error("Test error");

    app.post("/test", (c) => {
      return handleError(c, testError, {
        requestId: "req-123",
        errorCode: -32603,
        errorMessage: "Internal error",
        organizationId: "org-456",
        instanceId: "instance-789",
        logMessage: "Error with metadata",
        additionalMetadata: {
          customField: "customValue",
          numericField: 42,
        },
      });
    });

    await app.request("/test", { method: "POST" });

    expect(mockLogError).toHaveBeenCalledWith(
      "Error with metadata",
      testError,
      expect.objectContaining({
        customField: "customValue",
        numericField: 42,
      }),
    );
  });

  test("エラーメッセージがレスポンスのdata.messageに含まれる", async () => {
    const app = new Hono<HonoEnv>();
    const errorMessage = "Detailed error information";

    app.post("/test", (c) => {
      const error = new Error(errorMessage);
      return handleError(c, error, {
        requestId: "req-123",
        errorCode: -32603,
        errorMessage: "Internal error",
        organizationId: "org-456",
        instanceId: "instance-789",
        logMessage: "Test log message",
      });
    });

    const response = await app.request("/test", { method: "POST" });
    const body = (await response.json()) as JsonRpcErrorResponse;

    expect(body.error.data?.message).toBe(errorMessage);
  });

  describe("様々なエラーコード", () => {
    const errorCodes = [
      { code: -32700, message: "Parse error" },
      { code: -32600, message: "Invalid request" },
      { code: -32601, message: "Method not found" },
      { code: -32602, message: "Invalid params" },
      { code: -32603, message: "Internal error" },
    ];

    for (const { code, message } of errorCodes) {
      test(`エラーコード ${code} (${message}) が正しく設定される`, async () => {
        const app = new Hono<HonoEnv>();

        app.post("/test", (c) => {
          return handleError(c, new Error("Test"), {
            requestId: "req-123",
            errorCode: code,
            errorMessage: message,
            organizationId: "org-456",
            instanceId: "instance-789",
            logMessage: "Test",
          });
        });

        const response = await app.request("/test", { method: "POST" });
        const body = (await response.json()) as JsonRpcErrorResponse;

        expect(body.error.code).toBe(code);
        expect(body.error.message).toBe(message);
      });
    }
  });
});
