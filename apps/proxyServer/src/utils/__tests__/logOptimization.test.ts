import { describe, test, expect, vi, beforeEach } from "vitest";
import { logMcpRequest } from "../../libs/requestLogger.js";
import { TransportType } from "@tumiki/db";

// requestLoggerのモック
vi.mock("../../libs/requestLogger.js", () => ({
  logMcpRequest: vi.fn(),
}));

describe("ログ最適化", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HTTP transport（post.ts経由のリクエスト）", () => {
    test("tools/listリクエストで正しいツール名が記録されることを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      const requestData = '{"method":"tools/list","params":{}}';
      const responseData = '{"result":{"tools":[]}}';

      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "tools/list", // 修正: tools/listが記録される
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "POST",
        responseStatus: "200",
        durationMs: 400,
        inputBytes: 100,
        outputBytes: 200,
        requestData: requestData,
        responseData: responseData,
      };

      await logMcpRequest(logParams);

      expect(mockLogMcpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "tools/list",
          method: "POST",
          requestData: requestData,
          responseData: responseData,
        }),
      );
    });

    test("tools/callリクエストで実際のツール名が記録されることを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      const requestData =
        '{"method":"tools/call","params":{"name":"get_figma_data","arguments":{}}}';
      const responseData =
        '{"result":{"content":[{"type":"text","text":"data"}]}}';

      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "get_figma_data", // 実際のツール名が記録される
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "POST", // HTTPメソッド
        responseStatus: "200",
        durationMs: 500,
        inputBytes: 150,
        outputBytes: 250,
        requestData: requestData,
        responseData: responseData,
      };

      await logMcpRequest(logParams);

      expect(mockLogMcpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "get_figma_data",
          method: "POST",
          requestData: requestData,
          responseData: responseData,
        }),
      );
    });
  });
});
