// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context } from "hono";
import { PiiMaskingMode } from "@tumiki/db/server";
import type { HonoEnv, AuthContext } from "../../../types/index.js";
import { piiMaskingMiddleware } from "../index.ee.js";

// piiMasking ライブラリをモック
const mockMaskJson = vi.fn();
const mockMaskText = vi.fn();

vi.mock("../../../libs/piiMasking/index.js", () => ({
  maskJson: (data: unknown, options?: unknown): Promise<unknown> =>
    Promise.resolve(mockMaskJson(data, options) as unknown),
  maskText: (text: string, options?: unknown): Promise<unknown> =>
    Promise.resolve(mockMaskText(text, options) as unknown),
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
  responseContentType?: string;
}): Context<HonoEnv> => {
  const {
    authContext = null,
    requestBody = "",
    responseBody = "",
    responseStatus = 200,
    responseContentType = "application/json",
  } = options;

  const contextData = new Map<string, unknown>();
  if (authContext) {
    contextData.set("authContext", authContext);
  }

  const mockResponse = new Response(responseBody, {
    status: responseStatus,
    headers: { "content-type": responseContentType },
  });

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
  toonConversionEnabled: false,
  ...overrides,
});

describe("piiMaskingMiddleware", () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMaskJson.mockResolvedValue({
      maskedData: { masked: "data" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    mockMaskText.mockResolvedValue({
      maskedText: "masked text",
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
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("piiMaskingMode が DISABLED の場合はスキップ", async () => {
    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.DISABLED,
    });
    const c = createMockContext({ authContext });

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockMaskJson).not.toHaveBeenCalled();
  });

  test("リクエストボディをマスキングする", async () => {
    mockMaskJson.mockResolvedValue({
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
    expect(mockMaskJson).toHaveBeenCalledWith(
      { email: "test@example.com" },
      { infoTypes: [] },
    );
  });

  test("レスポンスボディをマスキングする", async () => {
    // リクエストマスキング（PII検出なし）
    mockMaskJson.mockResolvedValueOnce({
      maskedData: { query: "hello" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンスマスキング（PII検出あり）- maskTextを使用
    mockMaskText.mockResolvedValueOnce({
      maskedText: '{"email":"****@*******.com"}',
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

    await piiMaskingMiddleware(c, mockNext);

    const body = await c.res.text();
    expect(body).toBe('{"email":"****@*******.com"}');
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

    // リクエストマスキングはスキップ、レスポンスマスキング(maskText)のみ呼ばれる
    expect(mockMaskJson).not.toHaveBeenCalled();
    expect(mockMaskText).toHaveBeenCalledWith('{"result":"ok"}', {
      infoTypes: [],
    });
  });

  test("空のレスポンスボディの場合は元のレスポンスを返す", async () => {
    mockMaskJson.mockResolvedValueOnce({
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

    await piiMaskingMiddleware(c, mockNext);

    // 空のレスポンスの場合、c.resは変更されない（元のままで空文字）
    const body = await c.res.text();
    expect(body).toBe("");
  });

  test("PIIが検出されない場合でもマスキング処理は実行される", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { result: "no-pii" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    mockMaskText.mockResolvedValueOnce({
      maskedText: '{"result":"no-pii"}',
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

    await piiMaskingMiddleware(c, mockNext);

    // PII未検出でもmaskTextは呼び出される
    expect(mockMaskText).toHaveBeenCalled();
  });

  test("リクエストマスキングエラー時はフェイルオープン", async () => {
    // リクエストマスキングでエラー
    mockMaskJson.mockRejectedValueOnce(new Error("DLP error"));
    // レスポンスマスキングは正常
    mockMaskJson.mockResolvedValueOnce({
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
    mockMaskJson.mockResolvedValueOnce({
      maskedData: { request: "data" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンスマスキング(maskText)でエラー
    mockMaskText.mockRejectedValueOnce(new Error("DLP error"));

    const authContext = createAuthContext({
      piiMaskingMode: PiiMaskingMode.BOTH,
    });
    const c = createMockContext({
      authContext,
      requestBody: '{"request":"data"}',
      responseBody: '{"response":"with-pii"}',
    });

    await piiMaskingMiddleware(c, mockNext);

    // エラー時は元のレスポンスを返す（フェイルオープン）
    const body = await c.res.text();
    expect(body).toBe('{"response":"with-pii"}');
  });

  test("マスキング済みリクエストボディを実行コンテキストに保存", async () => {
    const requestPiiList = [{ infoType: "EMAIL_ADDRESS", count: 1 }];
    mockMaskJson.mockResolvedValueOnce({
      maskedData: { email: "****@*******.com" },
      detectedCount: 1,
      detectedPiiList: requestPiiList,
      processingTimeMs: 50,
    });
    // レスポンスマスキングはmaskTextを使用
    mockMaskText.mockResolvedValueOnce({
      maskedText: '{"result":"ok"}',
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
    mockMaskJson.mockResolvedValueOnce({
      maskedData: { query: "hello" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    const responsePiiList = [{ infoType: "EMAIL_ADDRESS", count: 1 }];
    // レスポンスマスキングはmaskTextを使用
    mockMaskText.mockResolvedValueOnce({
      maskedText: '{"result":"****@*******.com"}',
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

    // PII検出情報が実行コンテキストに保存されていることを確認
    // レスポンスボディはマスキング済みResponseから取得可能なため保存不要
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      piiDetectedResponse: responsePiiList,
    });
  });

  test("PII未検出でもマスク済みデータを実行コンテキストに保存", async () => {
    // リクエスト用のモック
    mockMaskJson.mockResolvedValueOnce({
      maskedData: { query: "hello" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    // レスポンス用のモック（maskTextを使用）
    mockMaskText.mockResolvedValueOnce({
      maskedText: '{"result":"world"}',
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

    // PII未検出でもリクエストボディと検出情報は実行コンテキストに保存される
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      requestBody: { query: "hello" },
      piiDetectedRequest: [],
    });
    // レスポンスはマスキング済みResponseから取得可能なため検出情報のみ保存
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      piiDetectedResponse: [],
    });
  });

  test("piiMaskingModeをコンテキストに保存", async () => {
    mockMaskJson.mockResolvedValue({
      maskedData: { data: "text" },
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 10,
    });
    mockMaskText.mockResolvedValue({
      maskedText: '{"data":"response"}',
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

  describe("レスポンスマスキング", () => {
    test("text/plainのレスポンスもマスキングされる", async () => {
      // maskTextはJSON/非JSONに関わらずテキストをマスキング
      mockMaskText.mockResolvedValueOnce({
        maskedText: "plain text with [EMAIL_ADDRESS]",
        detectedCount: 1,
        detectedPiiList: [{ infoType: "EMAIL_ADDRESS", count: 1 }],
        processingTimeMs: 50,
      });

      const authContext = createAuthContext({
        piiMaskingMode: PiiMaskingMode.RESPONSE,
      });
      const c = createMockContext({
        authContext,
        requestBody: '{"query":"hello"}',
        responseBody: "plain text with test@example.com",
        responseContentType: "text/plain",
      });

      await piiMaskingMiddleware(c, mockNext);

      const body = await c.res.text();
      expect(body).toBe("plain text with [EMAIL_ADDRESS]");
      expect(mockMaskText).toHaveBeenCalledWith(
        "plain text with test@example.com",
        { infoTypes: [] },
      );
    });

    test("application/jsonのレスポンスもマスキングされる", async () => {
      mockMaskJson.mockResolvedValueOnce({
        maskedData: { query: "hello" },
        detectedCount: 0,
        detectedPiiList: [],
        processingTimeMs: 10,
      });
      mockMaskText.mockResolvedValueOnce({
        maskedText: '{"email":"[EMAIL_ADDRESS]"}',
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
        responseContentType: "application/json",
      });

      await piiMaskingMiddleware(c, mockNext);

      const body = await c.res.text();
      expect(body).toBe('{"email":"[EMAIL_ADDRESS]"}');
    });
  });
});
