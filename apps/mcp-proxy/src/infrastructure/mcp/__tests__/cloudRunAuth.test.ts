import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// モック関数を先に定義
const mockFetchIdToken = vi.fn();
const mockGetIdTokenClient = vi.fn();

// google-auth-libraryのモック
vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({
    getIdTokenClient: mockGetIdTokenClient,
  })),
}));

// loggerモジュールのモック
vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

import { getCloudRunIdToken, createCloudRunHeaders } from "../cloudRunAuth.js";
import { logInfo, logError } from "../../../shared/logger/index.js";

describe("getCloudRunIdToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのモック実装
    mockGetIdTokenClient.mockResolvedValue({
      idTokenProvider: {
        fetchIdToken: mockFetchIdToken,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("正常にIDトークンを取得する", async () => {
    const mockToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-token";
    mockFetchIdToken.mockResolvedValue(mockToken);

    const result = await getCloudRunIdToken(
      "https://my-service.run.app/endpoint",
    );

    expect(result).toBe(mockToken);
    expect(logInfo).toHaveBeenCalledWith(
      "Cloud Run ID token obtained successfully",
      expect.objectContaining({
        serviceUrl: "https://my-service.run.app/endpoint",
        targetAudience: "https://my-service.run.app",
        tokenPreview: mockToken.substring(0, 20),
      }),
    );
  });

  test("URLからオーディエンスを正しく抽出する", async () => {
    mockFetchIdToken.mockResolvedValue("test-token");

    await getCloudRunIdToken("https://api.example.com:8080/path/to/endpoint");

    // getIdTokenClient が正しいオーディエンスで呼ばれることを確認
    expect(mockGetIdTokenClient).toHaveBeenCalledWith(
      "https://api.example.com:8080",
    );
  });

  test("空のトークンの場合はエラーをスローする", async () => {
    mockFetchIdToken.mockResolvedValue("");

    await expect(
      getCloudRunIdToken("https://my-service.run.app"),
    ).rejects.toThrow("Cloud Run authentication error");

    expect(logError).toHaveBeenCalledWith(
      "Cloud Run IAM authentication failed",
      expect.any(Error),
      { serviceUrl: "https://my-service.run.app" },
    );
  });

  test("nullトークンの場合はエラーをスローする", async () => {
    mockFetchIdToken.mockResolvedValue(null);

    await expect(
      getCloudRunIdToken("https://my-service.run.app"),
    ).rejects.toThrow("Cloud Run authentication error");
  });

  test("認証クライアント取得に失敗した場合はエラーをスローする", async () => {
    const originalError = new Error("Failed to get credentials");
    mockGetIdTokenClient.mockRejectedValue(originalError);

    await expect(
      getCloudRunIdToken("https://my-service.run.app"),
    ).rejects.toThrow(
      "Cloud Run authentication error: Failed to get credentials",
    );

    expect(logError).toHaveBeenCalledWith(
      "Cloud Run IAM authentication failed",
      originalError,
      { serviceUrl: "https://my-service.run.app" },
    );
  });

  test("トークン取得に失敗した場合はエラーをスローする", async () => {
    const originalError = new Error("Token fetch failed");
    mockFetchIdToken.mockRejectedValue(originalError);

    await expect(
      getCloudRunIdToken("https://my-service.run.app"),
    ).rejects.toThrow("Cloud Run authentication error: Token fetch failed");
  });

  test("不明なエラー型の場合も適切にハンドリングする", async () => {
    mockFetchIdToken.mockRejectedValue("string error");

    await expect(
      getCloudRunIdToken("https://my-service.run.app"),
    ).rejects.toThrow("Cloud Run authentication error: Unknown error");
  });
});

describe("createCloudRunHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdTokenClient.mockResolvedValue({
      idTokenProvider: {
        fetchIdToken: mockFetchIdToken,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("Authorizationヘッダーを含むヘッダーオブジェクトを返す", async () => {
    const mockToken = "test-id-token";
    mockFetchIdToken.mockResolvedValue(mockToken);

    const result = await createCloudRunHeaders("https://my-service.run.app");

    expect(result).toStrictEqual({
      Authorization: `Bearer ${mockToken}`,
    });
  });

  test("追加のヘッダーをマージする", async () => {
    mockFetchIdToken.mockResolvedValue("test-token");

    const additionalHeaders = {
      "X-Custom-Header": "custom-value",
      "Content-Type": "application/json",
    };

    const result = await createCloudRunHeaders(
      "https://my-service.run.app",
      additionalHeaders,
    );

    expect(result).toStrictEqual({
      Authorization: "Bearer test-token",
      "X-Custom-Header": "custom-value",
      "Content-Type": "application/json",
    });
  });

  test("追加ヘッダーがAuthorizationを上書きできる", async () => {
    mockFetchIdToken.mockResolvedValue("test-token");

    // 追加ヘッダーが後から適用されるため、上書き可能
    const additionalHeaders = {
      Authorization: "Bearer custom-token",
    };

    const result = await createCloudRunHeaders(
      "https://my-service.run.app",
      additionalHeaders,
    );

    // 追加ヘッダーが後から適用される（スプレッド演算子の順序）
    expect(result).toStrictEqual({
      Authorization: "Bearer custom-token",
    });
  });

  test("トークン取得に失敗した場合はエラーを伝播する", async () => {
    mockFetchIdToken.mockRejectedValue(new Error("Auth failed"));

    await expect(
      createCloudRunHeaders("https://my-service.run.app"),
    ).rejects.toThrow("Cloud Run authentication error");
  });
});
