import { describe, expect, test, beforeEach, vi, type Mock } from "vitest";
import type { db as DbType } from "@tumiki/db/tcp";
import type { logger as LoggerType } from "./logger.js";
import type { compressRequestResponseData as CompressType } from "./dataCompression.js";

// モック設定
interface MockTx {
  mcpServerRequestLog: {
    create: ReturnType<typeof vi.fn>;
  };
  mcpServerRequestData: {
    create: ReturnType<typeof vi.fn>;
  };
}

type TransactionCallback = (tx: MockTx) => Promise<unknown>;

// グローバル変数としてモックを定義
let mockTx: MockTx;
let mockDb: typeof DbType;
let mockLogger: typeof LoggerType;
let mockCompressRequestResponseData: typeof CompressType;

// モジュールレベルでモックを設定
vi.mock("@tumiki/db/tcp", () => {
  return {
    db: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock("./logger.js", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("./dataCompression.js", () => ({
  compressRequestResponseData: vi.fn(),
}));

import { logMcpRequest } from "./requestLogger.js";
import { db } from "@tumiki/db/tcp";
import { logger } from "./logger.js";
import { compressRequestResponseData } from "./dataCompression.js";

describe("logMcpRequest", () => {
  beforeEach(() => {
    // モックを初期化
    mockDb = db;
    mockLogger = logger;
    mockCompressRequestResponseData = compressRequestResponseData as Mock;

    // デフォルトの圧縮モック実装
    (mockCompressRequestResponseData as Mock).mockResolvedValue({
      inputDataCompressed: Buffer.from("compressed-input"),
      outputDataCompressed: Buffer.from("compressed-output"),
      originalInputSize: 100,
      originalOutputSize: 200,
      inputCompressionRatio: 0.5,
      outputCompressionRatio: 0.6,
      compressionRatio: 0.55,
    });

    mockTx = {
      mcpServerRequestLog: {
        create: vi.fn(async (params: { data: Record<string, unknown> }) => {
          return {
            id: "test-log-id",
            ...params.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
      },
      mcpServerRequestData: {
        create: vi.fn(async (params: { data: Record<string, unknown> }) => {
          return {
            id: "test-data-id",
            ...params.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
      },
    };

    // $transactionの実装を設定
    (mockDb.$transaction as Mock).mockImplementation(
      async (callback: TransactionCallback) => {
        return await callback(mockTx);
      },
    );

    // テスト前にモックをリセット
    vi.clearAllMocks();
  });

  test("基本的なリクエストログを正常に記録する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 150,
      inputBytes: 100,
      outputBytes: 200,
    };

    await logMcpRequest(params);

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestData.create).not.toHaveBeenCalled();
    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "test-tool",
        responseStatus: "200",
        durationMs: 150,
      }),
    );
  });

  test("詳細データを含むリクエストログを正常に記録する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "SSE" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 250,
      requestData: { method: "test", params: { id: 1 } },
      responseData: { result: "success", data: "test-data" },
    };

    await logMcpRequest(params);

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestData.create).toHaveBeenCalledTimes(1);

    const createDataCall = mockTx.mcpServerRequestData.create.mock
      .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
    expect(createDataCall).toBeDefined();
    expect(createDataCall?.data.requestLogId).toStrictEqual("test-log-id");
    expect(createDataCall?.data.inputDataCompressed).toBeInstanceOf(Buffer);
    expect(createDataCall?.data.outputDataCompressed).toBeInstanceOf(Buffer);
    expect(createDataCall?.data.originalInputSize).toBeGreaterThan(0);
    expect(createDataCall?.data.originalOutputSize).toBeGreaterThan(0);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request with detailed data logged successfully",
      expect.objectContaining({
        toolName: "test-tool",
        responseStatus: "200",
        durationMs: 250,
      }),
    );
  });

  test("オプションパラメータを含むリクエストログを記録する", async () => {
    const params = {
      userId: "user-123",
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "GET",
      responseStatus: "404",
      durationMs: 50,
      errorMessage: "Resource not found",
      errorCode: "NOT_FOUND",
      organizationId: "org-456",
      userAgent: "TestAgent/1.0",
    };

    await logMcpRequest(params);

    const createCall = mockTx.mcpServerRequestLog.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(createCall).toBeDefined();
    expect(createCall?.data).toMatchObject({
      userId: "user-123",
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS",
      method: "GET",
      responseStatus: "404",
      durationMs: 50,
      errorMessage: "Resource not found",
      errorCode: "NOT_FOUND",
      organizationId: "org-456",
      userAgent: "TestAgent/1.0",
    });
  });

  test("機密情報を含むツール名をマスクしてログ出力する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "api_key_manager",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "***_***_*******",
        responseStatus: "200",
        durationMs: 100,
      }),
    );
  });

  test("token を含むツール名をマスクする", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "auth-token-service",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "****-*****-*******",
      }),
    );
  });

  test("secret を含むツール名をマスクする", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "secret-manager",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "******-*******",
      }),
    );
  });

  test("password を含むツール名をマスクする", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "password_reset",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "********_*****",
      }),
    );
  });

  test("credential を含むツール名をマスクする", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "credential-store",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "**********-*****",
      }),
    );
  });

  test("機密情報を含まないツール名はマスクしない", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "weather-service",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "GET",
      responseStatus: "200",
      durationMs: 75,
    };

    await logMcpRequest(params);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "weather-service",
      }),
    );
  });

  test("データベースエラーが発生してもサービスを停止しない", async () => {
    (mockDb.$transaction as Mock).mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    // エラーが発生してもPromiseがrejectされないことを確認
    await expect(logMcpRequest(params)).resolves.toBeUndefined();

    expect(mockLogger.error as Mock).toHaveBeenCalledWith(
      "Failed to log MCP request",
      expect.objectContaining({
        toolName: "test-tool",
        error: "Database connection failed",
      }),
    );
  });

  test("圧縮処理でエラーが発生してもサービスを停止しない", async () => {
    (mockCompressRequestResponseData as Mock).mockRejectedValueOnce(
      new Error("Compression failed"),
    );

    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      requestData: { test: "data" },
      responseData: { result: "success" },
    };

    await expect(logMcpRequest(params)).resolves.toBeUndefined();

    expect(mockLogger.error as Mock).toHaveBeenCalledWith(
      "Failed to log MCP request",
      expect.objectContaining({
        toolName: "test-tool",
        error: "Compression failed",
      }),
    );
  });

  test("requestDataのみがある場合は基本ログのみ記録する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      requestData: { method: "test" },
      // responseData なし
    };

    await logMcpRequest(params);

    expect(mockTx.mcpServerRequestLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestData.create).not.toHaveBeenCalled();
  });

  test("responseDataのみがある場合は基本ログのみ記録する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      // requestData なし
      responseData: { result: "success" },
    };

    await logMcpRequest(params);

    expect(mockTx.mcpServerRequestLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestData.create).not.toHaveBeenCalled();
  });

  test("空のrequestDataとresponseDataでも詳細データを記録する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      requestData: {},
      responseData: {},
    };

    await logMcpRequest(params);

    expect(mockTx.mcpServerRequestLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestData.create).toHaveBeenCalledTimes(1);
  });

  test("大きなデータでも正常に処理する", async () => {
    const largeData = { content: "x".repeat(10000) };
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 500,
      requestData: largeData,
      responseData: largeData,
    };

    // 大きなデータ用のモックレスポンスを設定
    (mockCompressRequestResponseData as Mock).mockResolvedValueOnce({
      inputDataCompressed: Buffer.from("compressed-input-large"),
      outputDataCompressed: Buffer.from("compressed-output-large"),
      originalInputSize: 10020,
      originalOutputSize: 10020,
      inputCompressionRatio: 0.1,
      outputCompressionRatio: 0.1,
      compressionRatio: 0.1,
    });

    await logMcpRequest(params);

    expect(mockTx.mcpServerRequestLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.mcpServerRequestData.create).toHaveBeenCalledTimes(1);

    const createDataCall = mockTx.mcpServerRequestData.create.mock
      .calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
    expect(createDataCall).toBeDefined();
    expect(createDataCall?.data.originalInputSize).toBeGreaterThan(10000);
    expect(createDataCall?.data.originalOutputSize).toBeGreaterThan(10000);
  });

  test("非Error型のエラーも適切に処理する", async () => {
    (mockDb.$transaction as Mock).mockRejectedValueOnce("String error");

    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.error as Mock).toHaveBeenCalledWith(
      "Failed to log MCP request",
      expect.objectContaining({
        error: "String error",
      }),
    );
  });

  test("mcpServerInstanceIdが未定義の場合はログ記録をスキップする", async () => {
    const params = {
      mcpServerInstanceId: undefined,
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params as Parameters<typeof logMcpRequest>[0]);

    expect(mockLogger.debug as Mock).toHaveBeenCalledWith(
      "Skipping log record due to missing mcpServerInstanceId",
      expect.objectContaining({
        toolName: "test-tool",
        method: "POST",
      }),
    );
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  test("5MBを超えるリクエストデータの場合は詳細ログをスキップする", async () => {
    const largeData = "x".repeat(6 * 1024 * 1024); // 6MB
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      requestData: largeData,
      responseData: { result: "small" },
    };

    await logMcpRequest(params);

    expect(mockLogger.warn as Mock).toHaveBeenCalledWith(
      "Request/response data exceeds size limit, skipping detailed logging",
      expect.objectContaining({
        toolName: "test-tool",
        requestSize: expect.any(Number) as number,
        responseSize: expect.any(Number) as number,
        maxDataSize: 5 * 1024 * 1024,
      }),
    );
    expect(mockCompressRequestResponseData).not.toHaveBeenCalled();
    expect(mockTx.mcpServerRequestData.create).not.toHaveBeenCalled();
  });

  test("5MBを超えるレスポンスデータの場合は詳細ログをスキップする", async () => {
    const largeData = "y".repeat(6 * 1024 * 1024); // 6MB
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      requestData: { request: "small" },
      responseData: largeData,
    };

    await logMcpRequest(params);

    expect(mockLogger.warn as Mock).toHaveBeenCalledWith(
      "Request/response data exceeds size limit, skipping detailed logging",
      expect.objectContaining({
        toolName: "test-tool",
        requestSize: expect.any(Number) as number,
        responseSize: expect.any(Number) as number,
        maxDataSize: 5 * 1024 * 1024,
      }),
    );
    expect(mockCompressRequestResponseData).not.toHaveBeenCalled();
    expect(mockTx.mcpServerRequestData.create).not.toHaveBeenCalled();
  });

  test("nullの値を含むパラメータも正しく処理する", async () => {
    const params = {
      userId: null as unknown as string,
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      errorMessage: null as unknown as string,
      errorCode: null as unknown as string,
      inputBytes: null as unknown as number,
      outputBytes: null as unknown as number,
      organizationId: null as unknown as string,
      userAgent: null as unknown as string,
    };

    await logMcpRequest(params);

    const createCall = mockTx.mcpServerRequestLog.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(createCall).toBeDefined();
    expect(createCall?.data.userId).toBeNull();
    expect(createCall?.data.errorMessage).toBeNull();
    expect(createCall?.data.errorCode).toBeNull();
    expect(createCall?.data.inputBytes).toBeNull();
    expect(createCall?.data.outputBytes).toBeNull();
    expect(createCall?.data.organizationId).toBeNull();
    expect(createCall?.data.userAgent).toBeNull();
  });

  test("SSE transportTypeで正常にログを記録する", async () => {
    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "SSE" as const,
      method: "GET",
      responseStatus: "200",
      durationMs: 75,
    };

    await logMcpRequest(params);

    const createCall = mockTx.mcpServerRequestLog.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(createCall?.data.transportType).toStrictEqual("SSE");
  });
});
