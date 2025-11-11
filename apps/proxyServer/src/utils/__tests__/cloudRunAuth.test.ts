/**
 * @fileoverview Cloud Run IAM認証ユーティリティのテスト
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  getCloudRunIdToken,
  createCloudRunHeaders,
  resetAuthClient,
} from "../cloudRunAuth.js";
import { GoogleAuth } from "google-auth-library";

// google-auth-libraryのモック
vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn(),
}));

describe("cloudRunAuth", () => {
  const testTargetUrl = "https://test-service.run.app";

  beforeEach(() => {
    vi.resetAllMocks();
    resetAuthClient(); // シングルトンをリセット
  });

  describe("getCloudRunIdToken", () => {
    test("正常にIDトークンを取得できる", async () => {
      const mockIdToken = "test-id-token-12345";
      const mockFetchIdToken = vi.fn().mockResolvedValue(mockIdToken);
      const mockGetIdTokenClient = vi.fn().mockResolvedValue({
        idTokenProvider: {
          fetchIdToken: mockFetchIdToken,
        },
      });

      // GoogleAuthのモック実装
      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getIdTokenClient: mockGetIdTokenClient,
        }),
      );

      const token = await getCloudRunIdToken(testTargetUrl);

      expect(token).toBe(mockIdToken);
      expect(GoogleAuth).toHaveBeenCalledWith({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      expect(mockGetIdTokenClient).toHaveBeenCalledWith(testTargetUrl);
      expect(mockFetchIdToken).toHaveBeenCalledWith(testTargetUrl);
    });

    test("IDトークンがnullの場合、エラーをスローする", async () => {
      const mockFetchIdToken = vi.fn().mockResolvedValue(null);
      const mockGetIdTokenClient = vi.fn().mockResolvedValue({
        idTokenProvider: {
          fetchIdToken: mockFetchIdToken,
        },
      });

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getIdTokenClient: mockGetIdTokenClient,
        }),
      );

      await expect(getCloudRunIdToken(testTargetUrl)).rejects.toThrow(
        "Cloud Run authentication error: Failed to obtain ID token: token is empty",
      );
    });

    test("認証エラーが発生した場合、エラーをスローする", async () => {
      const mockError = new Error("Authentication failed");
      const mockGetIdTokenClient = vi.fn().mockRejectedValue(mockError);

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getIdTokenClient: mockGetIdTokenClient,
        }),
      );

      await expect(getCloudRunIdToken(testTargetUrl)).rejects.toThrow(
        "Cloud Run authentication error: Authentication failed",
      );
    });
  });

  describe("createCloudRunHeaders", () => {
    test("認証ヘッダーを正しく作成する", async () => {
      const mockIdToken = "test-id-token-12345";
      const mockFetchIdToken = vi.fn().mockResolvedValue(mockIdToken);
      const mockGetIdTokenClient = vi.fn().mockResolvedValue({
        idTokenProvider: {
          fetchIdToken: mockFetchIdToken,
        },
      });

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getIdTokenClient: mockGetIdTokenClient,
        }),
      );

      const headers = await createCloudRunHeaders(testTargetUrl);

      expect(headers).toStrictEqual({
        Authorization: `Bearer ${mockIdToken}`,
      });
    });

    test("追加のヘッダーを含む認証ヘッダーを作成する", async () => {
      const mockIdToken = "test-id-token-12345";
      const mockFetchIdToken = vi.fn().mockResolvedValue(mockIdToken);
      const mockGetIdTokenClient = vi.fn().mockResolvedValue({
        idTokenProvider: {
          fetchIdToken: mockFetchIdToken,
        },
      });

      (GoogleAuth as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({
          getIdTokenClient: mockGetIdTokenClient,
        }),
      );

      const additionalHeaders = {
        "X-API-Key": "test-api-key",
        "Content-Type": "application/json",
      };

      const headers = await createCloudRunHeaders(
        testTargetUrl,
        additionalHeaders,
      );

      expect(headers).toStrictEqual({
        Authorization: `Bearer ${mockIdToken}`,
        "X-API-Key": "test-api-key",
        "Content-Type": "application/json",
      });
    });
  });
});
