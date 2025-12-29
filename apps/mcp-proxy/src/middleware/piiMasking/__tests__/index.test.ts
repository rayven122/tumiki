import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "hono";
import { PiiMaskingMode } from "@tumiki/db/server";
import type { HonoEnv, AuthContext } from "../../../types/index.js";
import { piiMaskingMiddleware } from "../index.js";

// piiMasking ライブラリをモック
const mockGetPiiMaskingConfig = vi.fn();
const mockMaskMcpMessage = vi.fn();

vi.mock("../../../libs/piiMasking/index.js", () => ({
  getPiiMaskingConfig: (): Promise<unknown> =>
    Promise.resolve(mockGetPiiMaskingConfig() as unknown),
  maskMcpMessage: (data: unknown): Promise<unknown> =>
    Promise.resolve(mockMaskMcpMessage(data) as unknown),
}));

// logger をモック
vi.mock("../../../libs/logger/index.js", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// 実行コンテキストをモック
const mockUpdateExecutionContext = vi.fn();

vi.mock("../../requestLogging/context.js", () => ({
  updateExecutionContext: (updates: unknown): void => {
    mockUpdateExecutionContext(updates);
  },
}));

// モックコンテキストを作成するヘルパー
const createMockContext = (options: {
  authContext?: AuthContext | null;
  requestBody?: string;
  responseBody?: string;
  responseStatus?: number;
}): Context<HonoEnv> => {
  const {
    authContext = null,
    requestBody = "",
    responseBody = "",
    responseStatus = 200,
  } = options;

  const contextData = new Map<string, unknown>();
  if (authContext) {
    contextData.set("authContext", authContext);
  }

  const mockResponse = new Response(responseBody, { status: responseStatus });

  return {
    get: (key: string) => contextData.get(key),
    set: (key: string, value: unknown) => contextData.set(key, value),
    req: {
      text: () => Promise.resolve(requestBody),
      json: () => Promise.resolve(requestBody ? JSON.parse(requestBody) : null),
    },
    res: mockResponse,
  } as unknown as Context<HonoEnv>;
};

// デフォルトの認証コンテキスト
const createAuthContext = (
  overrides: Partial<AuthContext> = {},
): AuthContext => ({
  authMethod: "API_KEY",
  organizationId: "org-1",
  userId: "user-1",
  mcpServerId: "server-1",
  piiMaskingMode: PiiMaskingMode.BOTH,
  piiInfoTypes: [],
  ...overrides,
});

describe("piiMaskingMiddleware", () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPiiMaskingConfig.mockReturnValue({
      projectId: "test-project",
      isAvailable: true,
    });
    mockMaskMcpMessage.mockResolvedValue({
      maskedData: { masked: "data" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    mockUpdateExecutionContext.mockClear();
  });

  test("認証コンテキストがない場合はスキップ", async () => {
    const c = createMockContext({ authContext: null });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockGetPiiMaskingConfig).not.toHaveBeenCalled();
  });

  test("piiMaskingMode が DISABLED の場合はスキップ", async () => {
    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.DISABLED,
    });
    const c = createMockContext({ authContext });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockGetPiiMaskingConfig).not.toHaveBeenCalled();
  });

  test("GCP DLP が利用不可の場合はスキップ", async () => {
    mockGetPiiMaskingConfig.mockReturnValue({
      projectId: "test-project",
      isAvailable: false,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({ authContext });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockMaskMcpMessage).not.toHaveBeenCalled();
  });

  test("リクエストボディをマスキングする", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedData: { email: "****@*******.com" },
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"email":"test@example.com"}',
      responseBody: '{"result":"ok"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    // リクエストボディがマスキングされたことを確認（パース済みオブジェクトが渡される）
    expect(mockMaskMcpMessage).toHaveBeenCalledWith({
      email: "test@example.com",
    });
  });

  test("レスポンスボディをマスキングする", async () => {
    // リクエストマスキング（PII検出なし）
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { query: "hello" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンスマスキング（PII検出あり）
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { email: "****@*******.com" },
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"query":"hello"}',
      responseBody: '{"email":"test@example.com"}',
    });

    const result = await piiMaskingMiddleware(c, mockNext);

    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      const body = await result.text();
      expect(body).toBe('{"email":"****@*******.com"}');
    }
  });

  test("空のリクエストボディはスキップ", async () => {
    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: "",
      responseBody: '{"result":"ok"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // レスポンスのマスキングのみ呼ばれる（パース済みオブジェクトが渡される）
    expect(mockMaskMcpMessage).toHaveBeenCalledTimes(1);
    expect(mockMaskMcpMessage).toHaveBeenCalledWith({ result: "ok" });
  });

  test("空のレスポンスボディの場合は元のレスポンスを返す", async () => {
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { request: "data" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"request":"data"}',
      responseBody: "",
    });

    const result = await piiMaskingMiddleware(c, mockNext);

    expect(result).toBeInstanceOf(Response);
  });

  test("PIIが検出されない場合は元のレスポンスを返す", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedData: { result: "no-pii" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const originalResponseBody = '{"result":"no-pii"}';
    const c = createMockContext({
      authContext,
      requestBody: '{"request":"data"}',
      responseBody: originalResponseBody,
    });

    const result = await piiMaskingMiddleware(c, mockNext);

    // PII未検出の場合は元のレスポンスを返す
    expect(result).toBeInstanceOf(Response);
  });

  test("リクエストマスキングエラー時はフェイルオープン", async () => {
    // リクエストマスキングでエラー
    mockMaskMcpMessage.mockRejectedValueOnce(new Error("DLP error"));
    // レスポンスマスキングは正常
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { response: "data" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"request":"with-pii"}',
      responseBody: '{"response":"data"}',
    });

    // エラーが投げられずに処理が続行される
    await expect(piiMaskingMiddleware(c, mockNext)).resolves.not.toThrow();
    expect(mockNext).toHaveBeenCalled();
  });

  test("レスポンスマスキングエラー時はフェイルオープン", async () => {
    // リクエストマスキングは正常
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { request: "data" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンスマスキングでエラー
    mockMaskMcpMessage.mockRejectedValueOnce(new Error("DLP error"));

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"request":"data"}',
      responseBody: '{"response":"with-pii"}',
    });

    const result = await piiMaskingMiddleware(c, mockNext);

    // エラー時は元のレスポンスを返す
    expect(result).toBeInstanceOf(Response);
  });

  test("マスキング済みリクエストボディを実行コンテキストに保存", async () => {
    const requestPiiList = [{ infoType: "EMAIL_ADDRESS", count: 1 }];
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { email: "****@*******.com" },
      detectedCount: 1,
      detectedPiiList: requestPiiList,
      processingTimeMs: 50,
    });
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { result: "ok" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"email":"test@example.com"}',
      responseBody: '{"result":"ok"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // マスキング済みリクエストボディとPII検出情報が実行コンテキストに保存されていることを確認
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      requestBody: { email: "****@*******.com" },
      piiDetectedRequest: requestPiiList,
    });
  });

  test("マスキング済みレスポンスボディを実行コンテキストに保存", async () => {
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { query: "hello" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    const responsePiiList = [{ infoType: "EMAIL_ADDRESS", count: 1 }];
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { result: "****@*******.com" },
      detectedCount: 1,
      detectedPiiList: responsePiiList,
      processingTimeMs: 50,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"query":"hello"}',
      responseBody: '{"result":"test@example.com"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // マスキング済みレスポンスボディとPII検出情報が実行コンテキストに保存されていることを確認
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      responseBody: { result: "****@*******.com" },
      piiDetectedResponse: responsePiiList,
    });
  });

  test("PII未検出でもマスク済みデータを実行コンテキストに保存", async () => {
    // リクエスト用のモック
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { query: "hello" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンス用のモック
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedData: { result: "world" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"query":"hello"}',
      responseBody: '{"result":"world"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // PII未検出でも実行コンテキストに保存される（ログ記録時に再マスキング不要）
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      requestBody: { query: "hello" },
      piiDetectedRequest: [],
    });
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      responseBody: { result: "world" },
      piiDetectedResponse: [],
    });
  });

  test("piiMaskingModeをコンテキストに保存", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedData: { data: "text" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"data":"request"}',
      responseBody: '{"data":"response"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // piiMaskingMode と piiInfoTypes がコンテキストに保存されていることを確認
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      piiMaskingMode: PiiMaskingMode.BOTH,
      piiInfoTypes: [],
    });
  });
});
