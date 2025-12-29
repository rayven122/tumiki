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
vi.mock("../../logger/index.js", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

describe("maskText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("空文字列の場合はそのまま返す", async () => {
    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("");

    expect(result.maskedText).toBe("");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("プロジェクトIDが取得できない場合はそのまま返す", async () => {
    mockGetProjectId.mockRejectedValue(new Error("No credentials"));

    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("正常にマスキングが行われる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "****@*******.com" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [{ count: "1" }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("****@*******.com");
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

  test("複数のPIIが検出される場合", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "****@*******.com, ************" },
        overview: {
          transformationSummaries: [
            { infoType: { name: "EMAIL_ADDRESS" }, results: [{ count: "1" }] },
            { infoType: { name: "PHONE_NUMBER" }, results: [{ count: "1" }] },
          ],
        },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.js");

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

    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("test@example.com");

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
  });

  test("レスポンスにitemがない場合は元のテキストを返す", async () => {
    mockGetProjectId.mockResolvedValue("test-project");
    mockDeidentifyContent.mockResolvedValue([
      {
        item: null,
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.js");

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
    const { maskJson } = await import("../gcpDlpClient.js");

    const result = await maskJson(null);

    expect(result.maskedData).toBe(null);
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("undefinedの場合はそのまま返す", async () => {
    const { maskJson } = await import("../gcpDlpClient.js");

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

    const { maskJson } = await import("../gcpDlpClient.js");

    const result = await maskJson({ email: "test@example.com" });

    expect(result.maskedData).toStrictEqual({ email: "[EMAIL_ADDRESS]" });
    expect(result.detectedCount).toBe(1);
    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 1 },
    ]);
  });

  test("プロジェクトIDが取得できない場合は元のデータを返す", async () => {
    mockGetProjectId.mockRejectedValue(new Error("No credentials"));

    const { maskJson } = await import("../gcpDlpClient.js");
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

    const { maskJson } = await import("../gcpDlpClient.js");
    const originalData = { email: "test@example.com" };

    const result = await maskJson(originalData);

    // フェイルオープン: 元のデータを返す
    expect(result.maskedData).toStrictEqual(originalData);
    expect(result.detectedCount).toBe(0);
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

    const { maskText, closeDlpClient } = await import("../gcpDlpClient.js");

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
    const { closeDlpClient } = await import("../gcpDlpClient.js");

    // クライアントを初期化せずにクローズ
    await closeDlpClient();

    // close は呼ばれない
    expect(mockClose).not.toHaveBeenCalled();
  });
});
