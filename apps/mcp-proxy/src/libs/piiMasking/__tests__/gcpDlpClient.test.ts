import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { PiiMaskingConfig } from "../types.js";

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

describe("getPiiMaskingConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("GCP認証情報からプロジェクトIDを取得できる場合は有効", async () => {
    mockGetProjectId.mockResolvedValue("test-project");

    const { getPiiMaskingConfig } = await import("../gcpDlpClient.js");
    const config = await getPiiMaskingConfig();

    expect(config.projectId).toBe("test-project");
    expect(config.isAvailable).toBe(true);
  });

  test("プロジェクトID取得に失敗した場合は無効", async () => {
    mockGetProjectId.mockRejectedValue(new Error("No credentials found"));

    const { getPiiMaskingConfig } = await import("../gcpDlpClient.js");
    const config = await getPiiMaskingConfig();

    expect(config.projectId).toBe("");
    expect(config.isAvailable).toBe(false);
  });

  test("プロジェクトIDはキャッシュされる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");

    const { getPiiMaskingConfig } = await import("../gcpDlpClient.js");

    // 1回目の呼び出し
    const config1 = await getPiiMaskingConfig();
    expect(config1.projectId).toBe("test-project");

    // 2回目の呼び出し（キャッシュから取得）
    const config2 = await getPiiMaskingConfig();
    expect(config2.projectId).toBe("test-project");

    // GoogleAuthは1回のみ呼ばれる
    expect(mockGetProjectId).toHaveBeenCalledTimes(1);
  });

  test("resetProjectIdCacheでキャッシュをクリアできる", async () => {
    mockGetProjectId.mockResolvedValue("test-project");

    const { getPiiMaskingConfig, resetProjectIdCache } = await import(
      "../gcpDlpClient.js"
    );

    // 1回目の呼び出し
    await getPiiMaskingConfig();
    expect(mockGetProjectId).toHaveBeenCalledTimes(1);

    // キャッシュをリセット
    resetProjectIdCache();

    // 2回目の呼び出し（キャッシュがリセットされたので再取得）
    await getPiiMaskingConfig();
    expect(mockGetProjectId).toHaveBeenCalledTimes(2);
  });
});

describe("maskText", () => {
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
    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("", validConfig);

    expect(result.maskedText).toBe("");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("設定が無効な場合はそのまま返す", async () => {
    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("test@example.com", disabledConfig);

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("projectId が空の場合はそのまま返す", async () => {
    const { maskText } = await import("../gcpDlpClient.js");
    const configWithoutProject: PiiMaskingConfig = {
      projectId: "",
      isAvailable: true,
    };

    const result = await maskText("test@example.com", configWithoutProject);

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
    expect(mockDeidentifyContent).not.toHaveBeenCalled();
  });

  test("正常にマスキングが行われる", async () => {
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

    const result = await maskText("test@example.com", validConfig);

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

    const result = await maskText(
      "test@example.com, 090-1234-5678",
      validConfig,
    );

    expect(result.detectedCount).toBe(2);
    expect(result.detectedPiiList).toStrictEqual([
      { infoType: "EMAIL_ADDRESS", count: 1 },
      { infoType: "PHONE_NUMBER", count: 1 },
    ]);
  });

  test("DLP APIエラー時は元のテキストを返す（フェイルオープン）", async () => {
    mockDeidentifyContent.mockRejectedValue(new Error("DLP API error"));

    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("test@example.com", validConfig);

    expect(result.maskedText).toBe("test@example.com");
    expect(result.detectedCount).toBe(0);
  });

  test("レスポンスにitemがない場合は元のテキストを返す", async () => {
    mockDeidentifyContent.mockResolvedValue([
      {
        item: null,
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText } = await import("../gcpDlpClient.js");

    const result = await maskText("test@example.com", validConfig);

    expect(result.maskedText).toBe("test@example.com");
  });
});

describe("closeDlpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test("クライアントを正常にクローズする", async () => {
    mockClose.mockResolvedValue(undefined);
    mockDeidentifyContent.mockResolvedValue([
      {
        item: { value: "masked" },
        overview: { transformationSummaries: [] },
      },
    ]);

    const { maskText, closeDlpClient } = await import("../gcpDlpClient.js");

    const config: PiiMaskingConfig = {
      projectId: "test-project",
      isAvailable: true,
    };

    // まずマスキングを実行してクライアントを初期化
    await maskText("test", config);

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
