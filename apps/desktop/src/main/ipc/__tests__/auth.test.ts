import { describe, test, expect, beforeEach, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

// モックの設定
const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      mockIpcHandlers.set(
        channel,
        handler as (
          event: IpcMainInvokeEvent,
          ...args: unknown[]
        ) => Promise<unknown>,
      );
    },
  },
}));

vi.mock("../../db");
vi.mock("../../utils/encryption");
vi.mock("../../utils/logger");

// manager-registryのOAuthManager参照をモック
const mockGetOAuthManager = vi.fn().mockReturnValue(null);
vi.mock("../../auth/manager-registry", () => ({
  getOAuthManager: () => mockGetOAuthManager(),
}));

// テスト対象のインポート（モックの後に行う）
import { setupAuthIpc } from "../auth";
import { getDb } from "../../db";
import { encryptToken, decryptToken } from "../../utils/encryption";
import type { AuthTokenData } from "../../../types/auth";

describe("setupAuthIpc", () => {
  const mockDbAuthToken = {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  beforeEach(() => {
    // モックをリセット
    mockIpcHandlers.clear();
    vi.clearAllMocks();

    // getDb モックのセットアップ
    const mockDb = {
      authToken: mockDbAuthToken,
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({ authToken: mockDbAuthToken }),
      ),
    };
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
    );

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

    // IPC ハンドラーを設定
    setupAuthIpc();
  });

  describe("auth:getToken", () => {
    test("有効なトークンを取得できる", async () => {
      const mockToken = {
        id: "token-id",
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        idToken: null,
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getToken");
      expect(handler).toBeDefined();

      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toStrictEqual({
        accessToken: "test-access-token",
        idToken: null,
      });
      expect(mockDbAuthToken.findFirst).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });

    test("idTokenが存在する場合はidTokenも含めて返す", async () => {
      const mockToken = {
        id: "token-id",
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        idToken: "encrypted:test-id-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getToken");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toStrictEqual({
        accessToken: "test-access-token",
        idToken: "test-id-token",
      });
    });

    test("トークンが存在しない場合はnullを返す", async () => {
      mockDbAuthToken.findFirst.mockResolvedValue(null);

      const handler = mockIpcHandlers.get("auth:getToken");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toBeNull();
    });

    test("有効期限切れのトークンの場合はnullを返し、DBから削除する", async () => {
      const expiredToken = {
        id: "token-id",
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() - 1000), // 過去の日時
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(expiredToken);
      mockDbAuthToken.delete.mockResolvedValue(expiredToken);

      const handler = mockIpcHandlers.get("auth:getToken");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toBeNull();
      expect(mockDbAuthToken.delete).toHaveBeenCalledWith({
        where: { id: "token-id" },
      });
    });

    test("復号化されたトークンが空の場合はnullを返す", async () => {
      const mockToken = {
        id: "token-id",
        accessToken: "encrypted:",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getToken");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toBeNull();
    });

    test("データベースエラーの場合はエラーをスロー", async () => {
      mockDbAuthToken.findFirst.mockRejectedValue(new Error("Database error"));

      const handler = mockIpcHandlers.get("auth:getToken");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "認証トークンの取得に失敗しました",
      );
    });
  });

  describe("auth:saveToken", () => {
    test("有効なトークンを保存できる", async () => {
      const tokenData: AuthTokenData = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
      };

      const mockNewToken = {
        id: "new-token-id",
        accessToken: "encrypted:new-access-token",
        refreshToken: "encrypted:new-refresh-token",
        expiresAt: tokenData.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.create.mockResolvedValue(mockNewToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 0 });

      const handler = mockIpcHandlers.get("auth:saveToken");
      const result = await handler!({} as IpcMainInvokeEvent, tokenData);

      expect(result).toStrictEqual({ success: true });
      expect(mockDbAuthToken.create).toHaveBeenCalled();
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalled();
    });

    test("古いトークンを削除する", async () => {
      const tokenData: AuthTokenData = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockNewToken = {
        id: "new-token-id",
        accessToken: "encrypted:new-access-token",
        refreshToken: "encrypted:new-refresh-token",
        expiresAt: tokenData.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.create.mockResolvedValue(mockNewToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 2 });

      const handler = mockIpcHandlers.get("auth:saveToken");
      await handler!({} as IpcMainInvokeEvent, tokenData);

      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { not: "new-token-id" },
        },
      });
    });

    test("アクセストークンが空の場合はエラーをスロー", async () => {
      const invalidTokenData = {
        accessToken: "",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      };

      const handler = mockIpcHandlers.get("auth:saveToken");

      await expect(
        handler!({} as IpcMainInvokeEvent, invalidTokenData),
      ).rejects.toThrow("トークンデータが無効です");
    });

    test("リフレッシュトークンが空の場合はエラーをスロー", async () => {
      const invalidTokenData = {
        accessToken: "access-token",
        refreshToken: "",
        expiresAt: new Date(Date.now() + 3600000),
      };

      const handler = mockIpcHandlers.get("auth:saveToken");

      await expect(
        handler!({} as IpcMainInvokeEvent, invalidTokenData),
      ).rejects.toThrow("トークンデータが無効です");
    });

    test("有効期限が過去の場合はエラーをスロー", async () => {
      const invalidTokenData = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() - 1000),
      };

      const handler = mockIpcHandlers.get("auth:saveToken");

      await expect(
        handler!({} as IpcMainInvokeEvent, invalidTokenData),
      ).rejects.toThrow("トークンデータが無効です");
    });

    test("有効期限が1分未満の場合はエラーをスロー", async () => {
      const invalidTokenData = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 30000), // 30秒後
      };

      const handler = mockIpcHandlers.get("auth:saveToken");

      await expect(
        handler!({} as IpcMainInvokeEvent, invalidTokenData),
      ).rejects.toThrow("トークンデータが無効です");
    });

    test("文字列の有効期限をDateオブジェクトに変換できる", async () => {
      const tokenData = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 文字列として渡す
      };

      const mockNewToken = {
        id: "new-token-id",
        accessToken: "encrypted:access-token",
        refreshToken: "encrypted:refresh-token",
        expiresAt: new Date(tokenData.expiresAt),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.create.mockResolvedValue(mockNewToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 0 });

      const handler = mockIpcHandlers.get("auth:saveToken");
      const result = await handler!({} as IpcMainInvokeEvent, tokenData);

      expect(result).toStrictEqual({ success: true });
    });

    test("データベースエラーの場合はエラーをスロー", async () => {
      const tokenData: AuthTokenData = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockDbAuthToken.create.mockRejectedValue(new Error("Database error"));

      const handler = mockIpcHandlers.get("auth:saveToken");

      await expect(
        handler!({} as IpcMainInvokeEvent, tokenData),
      ).rejects.toThrow("認証トークンの保存に失敗しました");
    });
  });

  describe("auth:clearToken", () => {
    test("すべてのトークンを削除できる", async () => {
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 3 });

      const handler = mockIpcHandlers.get("auth:clearToken");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toStrictEqual({ success: true });
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    });

    test("トークンが存在しない場合でも成功する", async () => {
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 0 });

      const handler = mockIpcHandlers.get("auth:clearToken");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toStrictEqual({ success: true });
    });

    test("データベースエラーの場合はエラーをスロー", async () => {
      mockDbAuthToken.deleteMany.mockRejectedValue(new Error("Database error"));

      const handler = mockIpcHandlers.get("auth:clearToken");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "認証トークンの削除に失敗しました",
      );
    });
  });

  describe("auth:isAuthenticated", () => {
    test("有効なトークンが存在する場合はtrueを返す", async () => {
      const mockToken = {
        id: "token-id",
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:isAuthenticated");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toBe(true);
    });

    test("トークンが存在しない場合はfalseを返す", async () => {
      mockDbAuthToken.findFirst.mockResolvedValue(null);

      const handler = mockIpcHandlers.get("auth:isAuthenticated");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toBe(false);
    });

    test("有効期限切れのトークンの場合はfalseを返す", async () => {
      const expiredToken = {
        id: "token-id",
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() - 1000), // 過去の日時
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(expiredToken);

      const handler = mockIpcHandlers.get("auth:isAuthenticated");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toBe(false);
    });

    test("データベースエラーの場合はエラーをスローする", async () => {
      mockDbAuthToken.findFirst.mockRejectedValue(new Error("Database error"));

      const handler = mockIpcHandlers.get("auth:isAuthenticated");
      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "認証状態の確認に失敗しました",
      );
    });
  });

  describe("auth:login", () => {
    test("OAuthManagerが設定されている場合は認証フローを開始する", async () => {
      const mockStartAuthFlow = vi.fn().mockResolvedValue(undefined);
      mockGetOAuthManager.mockReturnValue({
        startAuthFlow: mockStartAuthFlow,
      });

      const handler = mockIpcHandlers.get("auth:login");
      expect(handler).toBeDefined();

      await handler!({} as IpcMainInvokeEvent);
      expect(mockStartAuthFlow).toHaveBeenCalled();
    });

    test("OAuthManagerが未設定の場合はエラーをスローする", async () => {
      mockGetOAuthManager.mockReturnValue(null);

      const handler = mockIpcHandlers.get("auth:login");
      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "OAuth認証が設定されていません",
      );
    });

    test("認証フロー開始に失敗した場合はエラーをスローする", async () => {
      mockGetOAuthManager.mockReturnValue({
        startAuthFlow: vi.fn().mockRejectedValue(new Error("Failed")),
      });

      const handler = mockIpcHandlers.get("auth:login");
      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "Failed",
      );
    });
  });

  describe("auth:logout", () => {
    test("OAuthManagerが設定されている場合はログアウトする", async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      mockGetOAuthManager.mockReturnValue({ logout: mockLogout });

      const handler = mockIpcHandlers.get("auth:logout");
      expect(handler).toBeDefined();

      await handler!({} as IpcMainInvokeEvent);
      expect(mockLogout).toHaveBeenCalled();
    });

    test("OAuthManagerが未設定でもローカルのトークンを削除する", async () => {
      mockGetOAuthManager.mockReturnValue(null);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });

      const handler = mockIpcHandlers.get("auth:logout");
      await handler!({} as IpcMainInvokeEvent);

      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    });

    test("ログアウトに失敗した場合はエラーをスローする", async () => {
      mockGetOAuthManager.mockReturnValue({
        logout: vi.fn().mockRejectedValue(new Error("Logout failed")),
      });

      const handler = mockIpcHandlers.get("auth:logout");
      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "Logout failed",
      );
    });
  });
});
