/**
 * @fileoverview Cloud Run IAM認証ユーティリティのテスト
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  getCloudRunAccessToken,
  createCloudRunHeaders,
  resetAuthClient,
} from "../cloudRunAuth.js";
import { GoogleAuth } from "google-auth-library";

// google-auth-libraryのモック
vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn(),
}));

describe("cloudRunAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetAuthClient(); // シングルトンをリセット
  });

  describe("getCloudRunAccessToken", () => {
    test("正常にアクセストークンを取得できる", async () => {
      const mockAccessToken = "test-access-token-12345";
      const mockGetAccessToken = vi
        .fn()
        .mockResolvedValue({ token: mockAccessToken });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });

      // GoogleAuthのモック実装
      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getClient: mockGetClient,
        }),
      );

      const token = await getCloudRunAccessToken();

      expect(token).toBe(mockAccessToken);
      expect(GoogleAuth).toHaveBeenCalledWith({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    });

    test("トークンがnullの場合、エラーをスローする", async () => {
      const mockGetAccessToken = vi.fn().mockResolvedValue({ token: null });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getClient: mockGetClient,
        }),
      );

      await expect(getCloudRunAccessToken()).rejects.toThrow(
        "Cloud Run authentication error: Failed to obtain access token",
      );
    });

    test("認証エラーが発生した場合、エラーをスローする", async () => {
      const mockError = new Error("Authentication failed");
      const mockGetClient = vi.fn().mockRejectedValue(mockError);

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getClient: mockGetClient,
        }),
      );

      await expect(getCloudRunAccessToken()).rejects.toThrow(
        "Cloud Run authentication error: Authentication failed",
      );
    });
  });

  describe("createCloudRunHeaders", () => {
    test("認証ヘッダーを正しく作成する", async () => {
      const mockAccessToken = "test-access-token-12345";
      const mockGetAccessToken = vi
        .fn()
        .mockResolvedValue({ token: mockAccessToken });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getClient: mockGetClient,
        }),
      );

      const headers = await createCloudRunHeaders();

      expect(headers).toStrictEqual({
        Authorization: `Bearer ${mockAccessToken}`,
      });
    });

    test("追加のヘッダーを含む認証ヘッダーを作成する", async () => {
      const mockAccessToken = "test-access-token-12345";
      const mockGetAccessToken = vi
        .fn()
        .mockResolvedValue({ token: mockAccessToken });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getClient: mockGetClient,
        }),
      );

      const additionalHeaders = {
        "X-API-Key": "test-api-key",
        "Content-Type": "application/json",
      };

      const headers = await createCloudRunHeaders(additionalHeaders);

      expect(headers).toStrictEqual({
        Authorization: `Bearer ${mockAccessToken}`,
        "X-API-Key": "test-api-key",
        "Content-Type": "application/json",
      });
    });
  });
});
