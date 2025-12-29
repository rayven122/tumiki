import { describe, test, expect, vi, beforeEach } from "vitest";
import type { JsonMaskingResult } from "../types.js";

// テスト用のJSON-RPC型定義
type JsonRpcRequest = {
  jsonrpc: string;
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: string;
  id: number;
  result?: Record<string, unknown>;
};

type JsonRpcErrorResponse = {
  jsonrpc: string;
  id: number;
  error: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
};

// モック関数を定義
const mockMaskJson =
  vi.fn<(data: unknown) => Promise<JsonMaskingResult<unknown>>>();

// gcpDlpClient をモック
vi.mock("../gcpDlpClient.js", () => ({
  maskJson: (data: unknown) => mockMaskJson(data),
}));

describe("maskMcpMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("nullの場合はそのまま返す", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const result = await maskMcpMessage(null);

    expect(result.maskedData).toBe(null);
    expect(result.detectedCount).toBe(0);
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("undefinedの場合はそのまま返す", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const result = await maskMcpMessage(undefined);

    expect(result.maskedData).toBe(undefined);
    expect(result.detectedCount).toBe(0);
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("リクエストのparamsのみをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { email: "[EMAIL_ADDRESS]" },
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { email: "test@example.com" },
    };

    const result = await maskMcpMessage(originalMessage);

    // paramsのみがマスキングされる（jsonrpc, id, methodは送信されない）
    expect(mockMaskJson).toHaveBeenCalledTimes(1);
    expect(mockMaskJson).toHaveBeenCalledWith({ email: "test@example.com" });

    // 結果のJSON-RPC構造が維持される
    const masked = result.maskedData as JsonRpcRequest;
    expect(masked.jsonrpc).toBe("2.0");
    expect(masked.id).toBe(1);
    expect(masked.method).toBe("tools/call");
    expect((masked.params as Record<string, string>).email).toBe(
      "[EMAIL_ADDRESS]",
    );
  });

  test("レスポンスのresultのみをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { name: "[PERSON_NAME]" },
      detectedCount: 1,
      detectedPiiList: [{ infoType: "PERSON_NAME", count: 1 }],
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = {
      jsonrpc: "2.0",
      id: 1,
      result: { name: "John Doe" },
    };

    const result = await maskMcpMessage(originalMessage);

    // resultのみがマスキングされる
    expect(mockMaskJson).toHaveBeenCalledTimes(1);
    expect(mockMaskJson).toHaveBeenCalledWith({ name: "John Doe" });

    const masked = result.maskedData as JsonRpcResponse;
    expect(masked.jsonrpc).toBe("2.0");
    expect(masked.id).toBe(1);
    expect((masked.result as Record<string, string>).name).toBe(
      "[PERSON_NAME]",
    );
  });

  test("エラーレスポンスのerror.dataのみをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { sensitive: "[SENSITIVE_DATA]" },
      detectedCount: 1,
      detectedPiiList: [{ infoType: "SENSITIVE_DATA", count: 1 }],
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = {
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32600,
        message: "Invalid Request",
        data: { sensitive: "user secret" },
      },
    };

    const result = await maskMcpMessage(originalMessage);

    // error.dataのみがマスキングされる（code, messageは送信されない）
    expect(mockMaskJson).toHaveBeenCalledTimes(1);
    expect(mockMaskJson).toHaveBeenCalledWith({ sensitive: "user secret" });

    const masked = result.maskedData as JsonRpcErrorResponse;
    expect(masked.error.code).toBe(-32600);
    expect(masked.error.message).toBe("Invalid Request");
    expect((masked.error.data as Record<string, string>).sensitive).toBe(
      "[SENSITIVE_DATA]",
    );
  });

  test("paramsがない場合はマスキングを呼ばない", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = {
      jsonrpc: "2.0",
      id: 1,
      method: "ping",
    };

    const result = await maskMcpMessage(message);

    expect(mockMaskJson).not.toHaveBeenCalled();
    expect(result.detectedCount).toBe(0);
    expect((result.maskedData as JsonRpcRequest).method).toBe("ping");
  });

  test("resultがないレスポンスはマスキングを呼ばない", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = {
      jsonrpc: "2.0",
      id: 1,
    };

    const result = await maskMcpMessage(message);

    expect(mockMaskJson).not.toHaveBeenCalled();
    expect(result.detectedCount).toBe(0);
  });

  test("バッチリクエスト（配列）は全体をmaskJsonに送信する", async () => {
    const maskedMessages = [
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { email: "[EMAIL_ADDRESS]" },
      },
    ];

    mockMaskJson.mockResolvedValue({
      maskedData: maskedMessages,
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessages = [
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { email: "test@example.com" },
      },
    ];

    const result = await maskMcpMessage(originalMessages);

    // バッチリクエストは全体がmaskJsonに送信される
    expect(mockMaskJson).toHaveBeenCalledWith(originalMessages);
    expect(result.maskedData).toStrictEqual(maskedMessages);
  });

  test("非JSON-RPCメッセージは全体をmaskJsonに送信する", async () => {
    const maskedMessage = { email: "[EMAIL_ADDRESS]" };
    mockMaskJson.mockResolvedValue({
      maskedData: maskedMessage,
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = {
      notJsonRpc: true,
      email: "test@example.com",
    };

    await maskMcpMessage(message);

    // JSON-RPCでないため全体がmaskJsonに送信される
    expect(mockMaskJson).toHaveBeenCalledWith(message);
  });

  test("ネストされたオブジェクト内のPIIもマスキングされる", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: {
        user: { contact: { email: "[EMAIL_ADDRESS]" } },
      },
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        user: { contact: { email: "test@example.com" } },
      },
    };

    const result = await maskMcpMessage(originalMessage);
    const masked = result.maskedData as JsonRpcRequest;
    const params = masked.params as { user: { contact: { email: string } } };

    expect(params.user.contact.email).toBe("[EMAIL_ADDRESS]");
  });

  test("同じInfoTypeが複数回検出された場合はマージされる", async () => {
    // paramsにemail、responseにもemailがある場合を想定
    // ただし実際にはリクエストかレスポンスのどちらかなので、
    // paramsとresultの両方がある（テスト用に想定外のケース）
    mockMaskJson
      .mockResolvedValueOnce({
        maskedData: { email1: "[EMAIL_ADDRESS]" },
        detectedCount: 1,
        detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
        processingTimeMs: 25,
      })
      .mockResolvedValueOnce({
        maskedData: { email2: "[EMAIL_ADDRESS]" },
        detectedCount: 1,
        detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
        processingTimeMs: 25,
      });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    // resultとerror.dataの両方がある（実際には稀なケース）
    const originalMessage = {
      jsonrpc: "2.0",
      id: 1,
      result: { email1: "test1@example.com" },
      error: {
        code: -32600,
        message: "Error",
        data: { email2: "test2@example.com" },
      },
    };

    const result = await maskMcpMessage(originalMessage);

    // 同じInfoTypeがマージされる
    expect(result.detectedCount).toBe(2);
    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 2 },
    ]);
  });
});
