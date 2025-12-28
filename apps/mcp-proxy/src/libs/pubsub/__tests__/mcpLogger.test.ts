import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { publishMcpLog, type McpLogEntry } from "../mcpLogger.js";

// Pub/Subモジュールをモック
vi.mock("../index.js", () => ({
  getMcpLogsTopic: vi.fn(),
  isBigQueryLoggingEnabled: vi.fn(),
}));

// loggerモジュールをモック
vi.mock("../../logger/index.js", () => ({
  logError: vi.fn(),
}));

import { getMcpLogsTopic, isBigQueryLoggingEnabled } from "../index.js";
import { logError } from "../../logger/index.js";

describe("publishMcpLog", () => {
  const mockPublishMessage = vi.fn();
  const mockTopic = {
    publishMessage: mockPublishMessage,
  };

  const baseLogEntry: McpLogEntry = {
    id: "test-id-123",
    mcpServerId: "server-1",
    organizationId: "org-1",
    userId: "user-1",
    toolName: "test-tool",
    transportType: "STREAMABLE_HTTPS",
    method: "tools/call",
    httpStatus: 200,
    durationMs: 100,
    inputBytes: 500,
    outputBytes: 1000,
    timestamp: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPublishMessage.mockResolvedValue("message-id");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("BigQueryロギングが無効な場合は何もしない", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(false);

    await publishMcpLog(baseLogEntry);

    expect(getMcpLogsTopic).not.toHaveBeenCalled();
    expect(mockPublishMessage).not.toHaveBeenCalled();
  });

  test("トピックがnullの場合は何もしない", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(null);

    await publishMcpLog(baseLogEntry);

    expect(mockPublishMessage).not.toHaveBeenCalled();
  });

  test("正常にログを送信する", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(mockTopic as never);

    await publishMcpLog(baseLogEntry);

    expect(mockPublishMessage).toHaveBeenCalledTimes(1);
    expect(mockPublishMessage).toHaveBeenCalledWith({
      json: baseLogEntry,
    });
  });

  test("リクエスト・レスポンスボディをそのまま送信する", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(mockTopic as never);

    const logWithBody: McpLogEntry = {
      ...baseLogEntry,
      requestBody: {
        method: "tools/call",
        params: {
          name: "test-tool",
          arguments: {
            api_key: "secret-key-12345",
            data: "normal-data",
          },
        },
      },
      responseBody: {
        result: {
          content: [{ type: "text", text: "response" }],
          token: "jwt-token",
        },
      },
    };

    await publishMcpLog(logWithBody);

    // マスキングなしでそのまま送信されることを確認
    expect(mockPublishMessage).toHaveBeenCalledWith({
      json: expect.objectContaining({
        requestBody: {
          method: "tools/call",
          params: {
            name: "test-tool",
            arguments: {
              api_key: "secret-key-12345",
              data: "normal-data",
            },
          },
        },
        responseBody: {
          result: {
            content: [{ type: "text", text: "response" }],
            token: "jwt-token",
          },
        },
      }) as McpLogEntry,
    });
  });

  test("送信エラー時にログを記録する", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(mockTopic as never);

    const testError = new Error("Pub/Sub error");
    mockPublishMessage.mockRejectedValue(testError);

    await publishMcpLog(baseLogEntry);

    expect(logError).toHaveBeenCalledWith(
      "Failed to publish MCP log to Pub/Sub",
      testError,
      {
        mcpServerId: "server-1",
        toolName: "test-tool",
      },
    );
  });

  test("mcpApiKeyIdを含むログを送信する", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(mockTopic as never);

    const logWithApiKeyId: McpLogEntry = {
      ...baseLogEntry,
      mcpApiKeyId: "api-key-id-123",
    };

    await publishMcpLog(logWithApiKeyId);

    expect(mockPublishMessage).toHaveBeenCalledWith({
      json: expect.objectContaining({
        mcpApiKeyId: "api-key-id-123",
      }) as McpLogEntry,
    });
  });

  test("エラー情報を含むログを送信する", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(mockTopic as never);

    const logWithError: McpLogEntry = {
      ...baseLogEntry,
      httpStatus: 500,
      errorCode: -32603,
      errorMessage: "Internal error",
    };

    await publishMcpLog(logWithError);

    expect(mockPublishMessage).toHaveBeenCalledWith({
      json: expect.objectContaining({
        httpStatus: 500,
        errorCode: -32603,
        errorMessage: "Internal error",
      }) as McpLogEntry,
    });
  });

  test("userAgentを含むログを送信する", async () => {
    vi.mocked(isBigQueryLoggingEnabled).mockReturnValue(true);
    vi.mocked(getMcpLogsTopic).mockReturnValue(mockTopic as never);

    const logWithUserAgent: McpLogEntry = {
      ...baseLogEntry,
      userAgent: "Mozilla/5.0 (compatible; ClaudeBot/1.0)",
    };

    await publishMcpLog(logWithUserAgent);

    expect(mockPublishMessage).toHaveBeenCalledWith({
      json: expect.objectContaining({
        userAgent: "Mozilla/5.0 (compatible; ClaudeBot/1.0)",
      }) as McpLogEntry,
    });
  });
});
