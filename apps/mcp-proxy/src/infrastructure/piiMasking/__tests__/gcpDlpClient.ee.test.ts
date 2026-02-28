// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, test, expect, vi, beforeEach } from "vitest";

// モック関数を定義
const mockDeidentifyContent = vi.fn();
const mockClose = vi.fn();
const mockGetProjectId = vi.fn();

// GCP DLP クライアントをモック
vi.mock("@google-cloud/dlp", () => {
  return {
    DlpServiceClient: class MockDlpServiceClient {
      deidentifyContent = mockDeidentifyContent;
      close = mockClose;
    },
  };
});

// GoogleAuthをモック
vi.mock("google-auth-library", () => {
  return {
    GoogleAuth: class MockGoogleAuth {
      getProjectId = mockGetProjectId;
    },
  };
});

// logger をモック
vi.mock("../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

describe("maskText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("空文字列の場合はそのまま返す", async () => {
    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("");

    expect(result.maskedText).toBe("");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("プロジェクトIDが取得できない場合はそのまま返す", async () => {
    mockGetProjectId.mockRejectedValue(new Error("No credentials"));

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("プロジェクトID取得でError以外がスローされた場合は文字列に変換される", async () => {
    // 非Errorオブジェクトをスロー（line 55のelse分岐）
    mockGetProjectId.mockRejectedValue("string error");

    const { maskText } = await import("../gcpDlpClient.ee.js");
    const { logWarn } = await import("../../../shared/logger/index.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
    expect(logWarn).toHaveBeenCalledWith(
      "GCPプロジェクトIDの取得に失敗しました。PIIマスキングは利用できません。",
      { error: "string error" },
    );
  });

  test("正常にマスキングが行われる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "[EMAIL_ADDRESS]" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [{ count: "1" }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("[EMAIL_ADDRESS]");
    expect(result.detectedCount).toBe(1);
    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 1 },
    ]);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(mockDeidentifyContent).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: "projects/test-project/locations/global",
        item: { value: "test@example.com" },
      }),
    );
  });

  test("replaceWithInfoTypeConfigで置換設定される", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "[EMAIL_ADDRESS]" },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    await maskText("test@example.com", { infoTypes: ["EMAIL_ADDRESS"] });

    // replaceWithInfoTypeConfig が正しく設定されていることを確認
    expect(mockDeidentifyContent).toHaveBeenCalledWith(
      expect.objectContaining({
        deidentifyConfig: {
          infoTypeTransformations: {
            transformations: [
              {
                infoTypes: [{ name: "EMAIL_ADDRESS" }],
                primitiveTransformation: {
                  replaceWithInfoTypeConfig: {},
                },
              },
            ],
          },
        },
      }),
    );
  });

  test("複数のPIIが検出される場合", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "[EMAIL_ADDRESS], [PHONE_NUMBER]" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [{ count: "1" }] },
            { infoType: { name: "PHONE_NUMBER" }, results: [{ count: "1" }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com, 090-1234-5678");

    expect(result.detectedCount).toBe(2);
    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 1 },
      { infoType: "PHONE_NUMBER", count: 1 },
    ]);
  });

  test("DLP APIエラー時は元のテキストを返す（フェイルオープン）", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockRejectedValue(new Error("DLP API error"));

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
  });

  test("DLP APIでError以外がスローされた場合はErrorでラップされる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");

    mockDeidentifyContent.mockRejectedValue("some error");

    const { maskText } = await import("../gcpDlpClient.ee.js");
    const { logError } = await import("../../../shared/logger/index.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
    // logErrorに渡されるエラーがErrorインスタンスであることを確認
    expect(logError).toHaveBeenCalledWith(
      "GCP DLPでのマスキングに失敗しました",
      expect.any(Error),
    );
  });

  test("2回目の呼び出しではキャッシュされたプロジェクトIDを使用する", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    // 1回目の呼び出し（プロジェクトID初期化）
    await maskText("first call");

    // 2回目の呼び出し（キャッシュされたプロジェクトIDを使用）
    await maskText("second call");

    // mockGetProjectIdは1回のみ呼ばれる（キャッシュが効いている）
    expect(mockGetProjectId).toHaveBeenCalledTimes(1);
  });

  test("transformationSummariesがnullの場合は空のdetectedPiiListを返す", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: { transformationSummaries: null },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([]);
    expect(result.detectedCount).toBe(0);
  });

  test("overviewがnullの場合は空のdetectedPiiListを返す", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: null,
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([]);
    expect(result.detectedCount).toBe(0);
  });

  test("summaryのinfoTypeがnullの場合はUNKNOWNにフォールバックする", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: {
          transformationSummaries: [
            { infoType: null, results: [{ count: "1" }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "UNKNOWN", count: 1 },
    ]);
  });

  test("summaryのinfoType.nameがundefinedの場合はUNKNOWNにフォールバックする", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: {
          transformationSummaries: [
            { infoType: { name: undefined }, results: [{ count: "2" }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "UNKNOWN", count: 2 },
    ]);
  });

  test("summaryのresultsがnullの場合はcount 0にフォールバックする", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: null },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 0 },
    ]);
  });

  test("summaryのresultsが空配列の場合はcount 0にフォールバックする", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 0 },
    ]);
  });

  test("summaryのresults[0].countがnullの場合はcount 0にフォールバックする", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [{ count: null }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 0 },
    ]);
  });

  test("レスポンスにitemがない場合は元のテキストを返す", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: null,
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.ee.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
  });
});

describe("maskJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("nullの場合はそのまま返す", async () => {
    const { maskJson } = await import("../gcpDlpClient.ee.js");

    const result = await maskJson(null);

    expect(result.maskedData).toBe(null);
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("undefinedの場合はそのまま返す", async () => {
    const { maskJson } = await import("../gcpDlpClient.ee.js");

    const result = await maskJson(undefined);

    expect(result.maskedData).toBe(undefined);
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("オブジェクトのマスキングが行われる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: '{"email":"[EMAIL_ADDRESS]"}' },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [{ count: "1" }] },
          ],
        },
      },
    ]);

    const { maskJson } = await import("../gcpDlpClient.ee.js");

    const result = await maskJson({ email: "test@example.com" });

    expect(result.maskedData).toStrictEqual({ email: "[EMAIL_ADDRESS]" });
    expect(result.detectedCount).toBe(1);
    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 1 },
    ]);
  });

  test("プロジェクトIDが取得できない場合は元のデータを返す", async () => {
    mockGetProjectId.mockRejectedValue(new Error("No credentials"));

    const { maskJson } = await import("../gcpDlpClient.ee.js");
    const originalData = { email: "test@example.com" };

    const result = await maskJson(originalData);

    expect(result.maskedData).toStrictEqual(originalData);
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("マスキング結果のJSONパースに失敗した場合は元のデータを返す", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    // 不正なJSONを返す
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "invalid json {{{" },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskJson } = await import("../gcpDlpClient.ee.js");
    const originalData = { email: "test@example.com" };

    const result = await maskJson(originalData);

    // フェイルオープン: 元のデータを返す
    expect(result.maskedData).toStrictEqual(originalData);
    expect(result.detectedCount).toBe(0);
  });

  test("JSONパースでError以外がスローされた場合はErrorでラップされる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: '{"email":"[EMAIL_ADDRESS]"}' },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskJson } = await import("../gcpDlpClient.ee.js");
    const { logError } = await import("../../../shared/logger/index.js");

    // JSON.parseをモックして非Errorをスローさせる（line 208のelse分岐）
    const originalParse = JSON.parse;
    let callCount = 0;
    vi.spyOn(JSON, "parse").mockImplementation((...args) => {
      callCount++;
      // maskJson内部のJSON.parseのみで非Errorをスロー
      // （最初のJSON.stringifyは影響しない）
      if (callCount === 1) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "parse failure";
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalParse(...args);
    });

    const originalData = { email: "test@example.com" };
    const result = await maskJson(originalData);

    expect(result.maskedData).toStrictEqual(originalData);
    expect(result.detectedCount).toBe(0);
    // logErrorに渡されるエラーがErrorインスタンスであることを確認
    expect(logError).toHaveBeenCalledWith(
      "マスキング結果のJSONパースに失敗しました",
      expect.objectContaining({
        message: "parse failure",
      }),
      expect.objectContaining({
        originalDataType: "object",
      }),
    );

    vi.restoreAllMocks();
  });
});

describe("closeDlpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("クライアントを正常にクローズする", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockClose.mockResolvedValue(undefined);
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText, closeDlpClient } = await import("../gcpDlpClient.ee.js");

    // まずマスキングを実行してクライアントを初期化
    await maskText("test");

    // クローズを実行
    await closeDlpClient();

    expect(mockClose).toHaveBeenCalledTimes(1);

    // 2回目のクローズは何もしない（クライアントがnullになっているため）
    await closeDlpClient();

    // close は1回のみ呼ばれる
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("クライアントが初期化されていない場合は何もしない", async () => {
    const { closeDlpClient } = await import("../gcpDlpClient.ee.js");

    // クライアントを初期化せずにクローズ
    await closeDlpClient();

    // close は呼ばれない
    expect(mockClose).not.toHaveBeenCalled();
  });
});

describe("resetProjectIdCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("キャッシュをリセットすると次の呼び出しでプロジェクトIDを再取得する", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText, resetProjectIdCache } =
      await import("../gcpDlpClient.ee.js");

    // 1回目の呼び出し（プロジェクトID初期化）
    await maskText("first call");
    expect(mockGetProjectId).toHaveBeenCalledTimes(1);

    // キャッシュをリセット
    resetProjectIdCache();

    // 2回目の呼び出し（再初期化が発生する）
    await maskText("second call");
    expect(mockGetProjectId).toHaveBeenCalledTimes(2);
  });
});
