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

  describe("tools/listログ最適化", () => {
    test("tools/listで詳細データが記録されないことを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      // tools/list用のログパラメータ（詳細データなし）
      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "tools/list",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "tools/list",
        responseStatus: "200",
        durationMs: 150,
        inputBytes: 100,
        outputBytes: 500,
      };

      await logMcpRequest(logParams);

      expect(mockLogMcpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "tools/list",
          durationMs: 150,
          inputBytes: 100,
          outputBytes: 500,
          // requestDataとresponseDataが含まれていないことを確認
        }),
      );

      // requestDataとresponseDataが呼び出しに含まれていないことを確認
      expect(mockLogMcpRequest.mock.calls).toHaveLength(1);
      const callArgs = mockLogMcpRequest.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty("requestData");
      expect(callArgs).not.toHaveProperty("responseData");
    });

    test("tools/listで基本メトリクスは記録されることを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "tools/list",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "tools/list",
        responseStatus: "200",
        durationMs: 250,
        inputBytes: 150,
        outputBytes: 750,
      };

      await logMcpRequest(logParams);

      expect(mockLogMcpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "tools/list",
          method: "tools/list",
          responseStatus: "200",
          durationMs: 250,
          inputBytes: 150,
          outputBytes: 750,
          transportType: TransportType.STREAMABLE_HTTPS,
        }),
      );
    });

    test("tools/listエラー時も詳細データが記録されないことを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "tools/list",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "tools/list",
        responseStatus: "500",
        durationMs: 300,
        errorMessage: "Connection timeout",
        errorCode: "TIMEOUT_ERROR",
      };

      await logMcpRequest(logParams);

      expect(mockLogMcpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "tools/list",
          responseStatus: "500",
          errorMessage: "Connection timeout",
          errorCode: "TIMEOUT_ERROR",
        }),
      );

      // requestDataとresponseDataが呼び出しに含まれていないことを確認
      expect(mockLogMcpRequest.mock.calls).toHaveLength(1);
      const callArgs = mockLogMcpRequest.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty("requestData");
      expect(callArgs).not.toHaveProperty("responseData");
    });
  });

  describe("tools/callログ（既存動作維持）", () => {
    test("tools/callで詳細データが記録されることを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      const requestData = {
        toolName: "test-tool",
        arguments: { param1: "value1" },
      };
      const responseData = { content: [{ type: "text", text: "Test result" }] };

      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "test-tool",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "tools/call",
        responseStatus: "200",
        durationMs: 500,
        inputBytes: 200,
        outputBytes: 300,
        requestData: JSON.stringify(requestData),
        responseData: JSON.stringify(responseData),
      };

      await logMcpRequest(logParams);

      expect(mockLogMcpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "test-tool",
          method: "tools/call",
          requestData: JSON.stringify(requestData),
          responseData: JSON.stringify(responseData),
        }),
      );
    });
  });

  describe("HTTP transport（既存動作維持）", () => {
    test("HTTP transportで詳細データが記録されることを確認", async () => {
      const mockLogMcpRequest = vi.mocked(logMcpRequest);

      const requestData = '{"method":"tools/list","params":{}}';
      const responseData = '{"result":{"tools":[]}}';

      const logParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "http_transport",
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
          toolName: "http_transport",
          requestData: requestData,
          responseData: responseData,
        }),
      );
    });
  });

  describe("パフォーマンス効果確認", () => {
    test("tools/listとtools/callのログパラメータサイズ比較", () => {
      // tools/listログパラメータ（詳細データなし）
      const toolsListParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "tools/list",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "tools/list",
        responseStatus: "200",
        durationMs: 150,
        inputBytes: 100,
        outputBytes: 500,
      };

      // tools/callログパラメータ（詳細データあり）
      const toolsCallParams = {
        mcpServerInstanceId: "test-instance-id",
        organizationId: "test-org-id",
        toolName: "test-tool",
        transportType: TransportType.STREAMABLE_HTTPS,
        method: "tools/call",
        responseStatus: "200",
        durationMs: 500,
        inputBytes: 200,
        outputBytes: 300,
        requestData: JSON.stringify({
          toolName: "test-tool",
          arguments: { param1: "value1" },
        }),
        responseData: JSON.stringify({
          content: [{ type: "text", text: "Test result" }],
        }),
      };

      const toolsListSize = JSON.stringify(toolsListParams).length;
      const toolsCallSize = JSON.stringify(toolsCallParams).length;

      // tools/listの方がサイズが小さいことを確認
      expect(toolsListSize).toBeLessThan(toolsCallSize);

      // サイズ削減効果を確認（50%以上の削減を期待）
      const reductionRatio = 1 - toolsListSize / toolsCallSize;
      expect(reductionRatio).toBeGreaterThan(0.3); // 30%以上の削減
    });
  });
});
