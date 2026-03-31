import { describe, test, expect, beforeEach, vi } from "vitest";

// モックの設定
vi.mock("../../db");
vi.mock("../../utils/encryption");
vi.mock("../../utils/logger");
vi.mock("../../repositories/auth.repository");

// テスト対象のインポート（モックの後に行う）
import * as authService from "../auth.service";
import { getDb } from "../../db";
import { encryptToken, decryptToken } from "../../utils/encryption";
import * as authRepository from "../../repositories/auth.repository";

describe("auth.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);

    // encryption モックのセットアップ
    vi.mocked(encryptToken).mockImplementation((plainText: string) =>
      Promise.resolve(`encrypted:${plainText}`),
    );
    vi.mocked(decryptToken).mockImplementation((encryptedText: string) => {
      if (encryptedText.startsWith("encrypted:")) {
        return Promise.resolve(encryptedText.replace("encrypted:", ""));
      }
      throw new Error("Invalid encrypted text");
    });
  });

  describe("getToken", () => {
    test("有効なトークンを復号化して返す", async () => {
      const mockToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(authRepository.findLatest).mockResolvedValue(mockToken);

      const result = await authService.getToken();

      expect(result).toBe("test-access-token");
      expect(authRepository.findLatest).toHaveBeenCalledWith(mockDb);
    });

    test("トークンが存在しない場合はnullを返す", async () => {
      vi.mocked(authRepository.findLatest).mockResolvedValue(null);

      const result = await authService.getToken();

      expect(result).toBeNull();
    });

    test("有効期限切れのトークンはDBから削除してnullを返す", async () => {
      const expiredToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(authRepository.findLatest).mockResolvedValue(expiredToken);
      vi.mocked(authRepository.deleteById).mockResolvedValue(expiredToken);

      const result = await authService.getToken();

      expect(result).toBeNull();
      expect(authRepository.deleteById).toHaveBeenCalledWith(mockDb, 1);
    });

    test("復号化されたトークンが空の場合はDBから削除してnullを返す", async () => {
      const mockToken = {
        id: 1,
        accessToken: "encrypted:",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(authRepository.findLatest).mockResolvedValue(mockToken);
      vi.mocked(authRepository.deleteById).mockResolvedValue(mockToken);

      const result = await authService.getToken();

      expect(result).toBeNull();
      expect(authRepository.deleteById).toHaveBeenCalledWith(mockDb, 1);
    });
  });

  describe("saveToken", () => {
    test("トークンを暗号化して保存し古いトークンを削除する", async () => {
      const tokenData = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      };
      const mockNewToken = {
        id: 5,
        accessToken: "encrypted:new-access-token",
        refreshToken: "encrypted:new-refresh-token",
        expiresAt: tokenData.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(authRepository.create).mockResolvedValue(mockNewToken);
      vi.mocked(authRepository.deleteAllExcept).mockResolvedValue({ count: 2 });

      const result = await authService.saveToken(tokenData);

      expect(result).toStrictEqual({ success: true });
      expect(authRepository.create).toHaveBeenCalledWith(mockDb, {
        accessToken: "encrypted:new-access-token",
        refreshToken: "encrypted:new-refresh-token",
        expiresAt: tokenData.expiresAt,
      });
      expect(authRepository.deleteAllExcept).toHaveBeenCalledWith(mockDb, 5);
    });
  });

  describe("clearToken", () => {
    test("すべてのトークンを削除する", async () => {
      vi.mocked(authRepository.deleteAll).mockResolvedValue({ count: 3 });

      const result = await authService.clearToken();

      expect(result).toStrictEqual({ success: true });
      expect(authRepository.deleteAll).toHaveBeenCalledWith(mockDb);
    });
  });

  describe("isAuthenticated", () => {
    test("有効なトークンが存在する場合はtrueを返す", async () => {
      const mockToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(authRepository.findLatest).mockResolvedValue(mockToken);

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    test("トークンが存在しない場合はfalseを返す", async () => {
      vi.mocked(authRepository.findLatest).mockResolvedValue(null);

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });

    test("有効期限切れのトークンの場合はfalseを返す", async () => {
      const expiredToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(authRepository.findLatest).mockResolvedValue(expiredToken);

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
