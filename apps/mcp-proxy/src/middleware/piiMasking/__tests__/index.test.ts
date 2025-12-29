import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "hono";
import type { HonoEnv, AuthContext } from "../../../types/index.js";
import { piiMaskingMiddleware } from "../index.js";

// piiMasking ライブラリをモック
const mockGetPiiMaskingConfig = vi.fn();
const mockMaskMcpMessage = vi.fn();

vi.mock("../../../libs/piiMasking/index.js", () => ({
  getPiiMaskingConfig: (): Promise<unknown> =>
    Promise.resolve(mockGetPiiMaskingConfig() as unknown),
  maskMcpMessage: (...args: unknown[]): Promise<unknown> =>
    Promise.resolve(mockMaskMcpMessage(...args) as unknown),
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
  piiMaskingEnabled: true,
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
      maskedText: "masked-text",
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

  test("piiMaskingEnabled が false の場合はスキップ", async () => {
    const authContext = createAuthContext({ piiMaskingEnabled: false });
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

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({ authContext });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockMaskMcpMessage).not.toHaveBeenCalled();
  });

  test("リクエストボディをマスキングする", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedText: '{"email":"****@*******.com"}',
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: '{"email":"test@example.com"}',
      responseBody: '{"result":"ok"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    // リクエストボディがマスキングされたことを確認
    expect(mockMaskMcpMessage).toHaveBeenCalledWith(
      '{"email":"test@example.com"}',
      expect.objectContaining({ projectId: "test-project" }),
    );
  });

  test("レスポンスボディをマスキングする", async () => {
    // リクエストマスキング（PII検出なし）
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: '{"query":"hello"}',
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンスマスキング（PII検出あり）
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: '{"email":"****@*******.com"}',
      detectedCount: 1,
      detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
      processingTimeMs: 50,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
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
    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: "",
      responseBody: '{"result":"ok"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // レスポンスのマスキングのみ呼ばれる
    expect(mockMaskMcpMessage).toHaveBeenCalledTimes(1);
    expect(mockMaskMcpMessage).toHaveBeenCalledWith(
      '{"result":"ok"}',
      expect.objectContaining({ projectId: "test-project" }),
    );
  });

  test("空のレスポンスボディの場合は元のレスポンスを返す", async () => {
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: "request",
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: "request",
      responseBody: "",
    });

    const result = await piiMaskingMiddleware(c, mockNext);

    expect(result).toBeInstanceOf(Response);
  });

  test("PIIが検出されない場合は元のレスポンスを返す", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedText: "no-pii-text",
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const originalResponseBody = '{"result":"no-pii"}';
    const c = createMockContext({
      authContext,
      requestBody: "request",
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
      maskedText: "response",
      detectedCount: 0,
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: "request-with-pii",
      responseBody: "response",
    });

    // エラーが投げられずに処理が続行される
    await expect(piiMaskingMiddleware(c, mockNext)).resolves.not.toThrow();
    expect(mockNext).toHaveBeenCalled();
  });

  test("レスポンスマスキングエラー時はフェイルオープン", async () => {
    // リクエストマスキングは正常
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: "request",
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンスマスキングでエラー
    mockMaskMcpMessage.mockRejectedValueOnce(new Error("DLP error"));

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: "request",
      responseBody: "response-with-pii",
    });

    const result = await piiMaskingMiddleware(c, mockNext);

    // エラー時は元のレスポンスを返す
    expect(result).toBeInstanceOf(Response);
  });

  test("マスキング済みリクエストボディを実行コンテキストに保存", async () => {
    const requestPiiList = [{ infoType: "EMAIL_ADDRESS", count: 1 }];
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: '{"email":"****@*******.com"}',
      detectedCount: 1,
      detectedPiiList: requestPiiList,
      processingTimeMs: 50,
    });
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: '{"result":"ok"}',
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: '{"email":"test@example.com"}',
      responseBody: '{"result":"ok"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // マスキング済みリクエストボディとPII検出情報が実行コンテキストに保存されていることを確認
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      requestBody: '{"email":"****@*******.com"}',
      piiDetectedRequest: requestPiiList,
    });
  });

  test("マスキング済みレスポンスボディを実行コンテキストに保存", async () => {
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: '{"query":"hello"}',
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    const responsePiiList = [{ infoType: "EMAIL_ADDRESS", count: 1 }];
    mockMaskMcpMessage.mockResolvedValueOnce({
      maskedText: '{"result":"****@*******.com"}',
      detectedCount: 1,
      detectedPiiList: responsePiiList,
      processingTimeMs: 50,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: '{"query":"hello"}',
      responseBody: '{"result":"test@example.com"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // マスキング済みレスポンスボディとPII検出情報が実行コンテキストに保存されていることを確認
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      responseBody: '{"result":"****@*******.com"}',
      piiDetectedResponse: responsePiiList,
    });
  });

  test("PII未検出でもマスク済みデータを実行コンテキストに保存", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedText: "no-pii-text",
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: '{"query":"hello"}',
      responseBody: '{"result":"world"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // PII未検出でも実行コンテキストに保存される（ログ記録時に再マスキング不要）
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      requestBody: "no-pii-text",
      piiDetectedRequest: [],
    });
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      responseBody: "no-pii-text",
      piiDetectedResponse: [],
    });
  });

  test("piiMaskingEnabledをコンテキストに保存", async () => {
    mockMaskMcpMessage.mockResolvedValue({
      maskedText: "text",
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });

    const authContext = createAuthContext({ piiMaskingEnabled: true });
    const c = createMockContext({
      authContext,
      requestBody: "request",
      responseBody: "response",
    });

    await piiMaskingMiddleware(c, mockNext);

    // piiMaskingEnabled が true としてコンテキストに保存されていることを確認
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      piiMaskingEnabled: true,
    });
  });
});
