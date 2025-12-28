import { describe, test, expect, vi, beforeEach } from "vitest";
import type {
  PiiMaskingConfig,
  MaskingResult,
  JsonMaskingResult,
} from "../types.js";

// モック関数を定義
const mockMaskText =
  vi.fn<(text: string, config: PiiMaskingConfig) => Promise<MaskingResult>>();
const mockMaskJson =
  vi.fn<
    <T>(data: T, config: PiiMaskingConfig) => Promise<JsonMaskingResult<T>>
  >();

// gcpDlpClient をモック
vi.mock("../gcpDlpClient.js", () => ({
  maskText: (text: string, config: PiiMaskingConfig) =>
    mockMaskText(text, config),
  maskJson: <T>(data: T, config: PiiMaskingConfig) =>
    mockMaskJson(data, config),
}));

describe("maskMcpMessage", () => {
  const validConfig: PiiMaskingConfig = {
    projectId: "test-project",
    isAvailable: true,
  };

  const disabledConfig: PiiMaskingConfig = {
    projectId: "test-project",
    isAvailable: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("空文字列の場合はそのまま返す", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const result = await maskMcpMessage("", validConfig);

    expect(result.maskedText).toBe("");
    expect(result.detectedCount).toBe(0);
    expect(mockMaskText).not.toHaveBeenCalled();
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("空白のみの場合はそのまま返す", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const result = await maskMcpMessage("   ", validConfig);

    expect(result.maskedText).toBe("   ");
    expect(result.detectedCount).toBe(0);
    expect(mockMaskText).not.toHaveBeenCalled();
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("設定が無効な場合はそのまま返す", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { email: "test@example.com" },
    });

    const result = await maskMcpMessage(message, disabledConfig);

    expect(result.maskedText).toBe(message);
    expect(result.detectedCount).toBe(0);
    expect(mockMaskText).not.toHaveBeenCalled();
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("リクエストのparamsのみをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { email: "[EMAIL_ADDRESS]" },
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { email: "test@example.com" },
    });

    const result = await maskMcpMessage(originalMessage, validConfig);

    // paramsのみがマスキングされる（jsonrpc, id, methodは送信されない）
    expect(mockMaskJson).toHaveBeenCalledTimes(1);
    expect(mockMaskJson).toHaveBeenCalledWith(
      { email: "test@example.com" },
      validConfig,
    );

    // 結果のJSON-RPC構造が維持される
    const parsed = JSON.parse(result.maskedText);
    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.id).toBe(1);
    expect(parsed.method).toBe("tools/call");
    expect(parsed.params.email).toBe("[EMAIL_ADDRESS]");
  });

  test("レスポンスのresultのみをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { name: "[PERSON_NAME]" },
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { name: "John Doe" },
    });

    const result = await maskMcpMessage(originalMessage, validConfig);

    // resultのみがマスキングされる
    expect(mockMaskJson).toHaveBeenCalledTimes(1);
    expect(mockMaskJson).toHaveBeenCalledWith(
      { name: "John Doe" },
      validConfig,
    );

    const parsed = JSON.parse(result.maskedText);
    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.id).toBe(1);
    expect(parsed.result.name).toBe("[PERSON_NAME]");
  });

  test("エラーレスポンスのerror.dataのみをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { sensitive: "[SENSITIVE_DATA]" },
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32600,
        message: "Invalid Request",
        data: { sensitive: "user secret" },
      },
    });

    const result = await maskMcpMessage(originalMessage, validConfig);

    // error.dataのみがマスキングされる（code, messageは送信されない）
    expect(mockMaskJson).toHaveBeenCalledTimes(1);
    expect(mockMaskJson).toHaveBeenCalledWith(
      { sensitive: "user secret" },
      validConfig,
    );

    const parsed = JSON.parse(result.maskedText);
    expect(parsed.error.code).toBe(-32600);
    expect(parsed.error.message).toBe("Invalid Request");
    expect(parsed.error.data.sensitive).toBe("[SENSITIVE_DATA]");
  });

  test("paramsがない場合はマスキングを呼ばない", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "ping",
    });

    const result = await maskMcpMessage(message, validConfig);

    expect(mockMaskJson).not.toHaveBeenCalled();
    expect(result.detectedCount).toBe(0);
  });

  test("resultがないレスポンスはマスキングを呼ばない", async () => {
    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
    });

    const result = await maskMcpMessage(message, validConfig);

    expect(mockMaskJson).not.toHaveBeenCalled();
    expect(result.detectedCount).toBe(0);
  });

  test("バッチリクエストは全体をmaskTextに送信する", async () => {
    const maskedMessages = JSON.stringify([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { email: "[EMAIL_ADDRESS]" },
      },
    ]);

    mockMaskText.mockResolvedValue({
      maskedText: maskedMessages,
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessages = JSON.stringify([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { email: "test@example.com" },
      },
    ]);

    const result = await maskMcpMessage(originalMessages, validConfig);

    // バッチリクエストは全体がmaskTextに送信される
    expect(mockMaskText).toHaveBeenCalledWith(originalMessages, validConfig);
    expect(mockMaskJson).not.toHaveBeenCalled();
    expect(result.maskedText).toBe(maskedMessages);
  });

  test("非JSON-RPCメッセージは全体をmaskTextに送信する", async () => {
    mockMaskText.mockResolvedValue({
      maskedText: JSON.stringify({ email: "[EMAIL_ADDRESS]" }),
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const message = JSON.stringify({
      notJsonRpc: true,
      email: "test@example.com",
    });

    await maskMcpMessage(message, validConfig);

    // JSON-RPCでないため全体がmaskTextに送信される
    expect(mockMaskText).toHaveBeenCalledWith(message, validConfig);
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("JSONパースに失敗した場合は全体をmaskTextに送信する", async () => {
    mockMaskText.mockResolvedValue({
      maskedText: "invalid json with [EMAIL_ADDRESS]",
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const text = "invalid json with email";

    await maskMcpMessage(text, validConfig);

    expect(mockMaskText).toHaveBeenCalledWith(text, validConfig);
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("ネストされたオブジェクト内のPIIもマスキングされる", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: {
        user: { contact: { email: "[EMAIL_ADDRESS]" } },
      },
      detectedCount: 1,
      processingTimeMs: 50,
    });

    const { maskMcpMessage } = await import("../jsonRpcMasker.js");

    const originalMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        user: { contact: { email: "test@example.com" } },
      },
    });

    const result = await maskMcpMessage(originalMessage, validConfig);
    const parsed = JSON.parse(result.maskedText);

    expect(parsed.params.user.contact.email).toBe("[EMAIL_ADDRESS]");
  });
});
