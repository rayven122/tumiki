import { describe, expect, test, beforeEach, mock } from "bun:test";
import { logMcpRequest } from "./requestLogger.js";

// モック設定
interface MockTx {
  mcpServerRequestLog: {
    create: ReturnType<typeof mock>;
  };
  mcpServerRequestData: {
    create: ReturnType<typeof mock>;
  };
}

type TransactionCallback = (tx: MockTx) => Promise<unknown>;

const mockDb = {
  $transaction: mock(async (callback: TransactionCallback) => {
    return await callback(mockTx);
  }),
};

const mockTx: MockTx = {
  mcpServerRequestLog: {
    create: mock(async (params: { data: Record<string, unknown> }) => {
      return {
        id: "test-log-id",
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
  },
  mcpServerRequestData: {
    create: mock(async (params: { data: Record<string, unknown> }) => {
      return {
        id: "test-data-id",
        ...params.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
  },
};

const mockLogger = {
  debug: mock(() => {
    // Mock debug logger
  }),
  error: mock(() => {
    // Mock error logger
  }),
  info: mock(() => {
    // Mock info logger
  }),
  warn: mock(() => {
    // Mock warn logger
  }),
};

// モジュールレベルでモックを設定
void mock.module("@tumiki/db/tcp", () => ({
  db: mockDb,
}));

void mock.module("./logger.js", () => ({
  logger: mockLogger,
}));

describe("logMcpRequest", () => {
  beforeEach(() => {
    // テスト前にモックをリセット
    mockDb.$transaction.mockClear();
    mockTx.mcpServerRequestLog.create.mockClear();
    mockTx.mcpServerRequestData.create.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.error.mockClear();
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
    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
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

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "MCP request logged successfully",
      expect.objectContaining({
        toolName: "weather-service",
      }),
    );
  });

  test("データベースエラーが発生してもサービスを停止しない", () => {
    mockDb.$transaction.mockRejectedValueOnce(
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
    expect(logMcpRequest(params)).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to log MCP request",
      expect.objectContaining({
        toolName: "test-tool",
        error: "Database connection failed",
      }),
    );
  });

  test("圧縮処理でエラーが発生してもサービスを停止しない", () => {
    const obj: { a: number; self?: unknown } = { a: 1 };
    obj.self = obj; // 循環参照でJSON.stringifyが失敗

    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
      requestData: obj,
      responseData: { result: "success" },
    };

    expect(logMcpRequest(params)).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to log MCP request",
      expect.objectContaining({
        toolName: "test-tool",
        error: expect.stringMatching(/.+/) as string,
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
    mockDb.$transaction.mockRejectedValueOnce("String error");

    const params = {
      mcpServerInstanceId: "test-instance-id",
      toolName: "test-tool",
      transportType: "STREAMABLE_HTTPS" as const,
      method: "POST",
      responseStatus: "200",
      durationMs: 100,
    };

    await logMcpRequest(params);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to log MCP request",
      expect.objectContaining({
        error: "String error",
      }),
    );
  });
});
