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

vi.mock("../../shared/db");
vi.mock("../../utils/encryption");
vi.mock("../../shared/utils/logger");
vi.mock("../../shared/profile-store");

// manager-registryのOAuthManager参照をモック
const mockGetOAuthManager = vi.fn().mockReturnValue(null);
const mockSetOAuthManager = vi.fn();
vi.mock("../../auth/manager-registry", () => ({
  getOAuthManager: () => mockGetOAuthManager(),
  setOAuthManager: (manager: unknown) => mockSetOAuthManager(manager),
}));

// テスト対象のインポート（モックの後に行う）
import { setupAuthIpc } from "../auth";
import { getDb } from "../../shared/db";
import { decryptToken } from "../../utils/encryption";
import { AUTH_REQUIRED_MESSAGE } from "../../../shared/constants";
import { resetProfileState } from "../../shared/profile-store";

const createJwt = (claims: Record<string, unknown>): string =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

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
    vi.mocked(resetProfileState).mockResolvedValue({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });

    // encryption モックのセットアップ
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
        id: 1,
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
      });
      expect(mockDbAuthToken.findFirst).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });

    test("トークンが存在しない場合はエラーを返す", async () => {
      mockDbAuthToken.findFirst.mockResolvedValue(null);

      const handler = mockIpcHandlers.get("auth:getToken");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        AUTH_REQUIRED_MESSAGE,
      );
    });

    test("有効期限切れのトークンの場合はエラーを返し、DBから削除する", async () => {
      const expiredToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() - 1000), // 過去の日時
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(expiredToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });

      const handler = mockIpcHandlers.get("auth:getToken");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        AUTH_REQUIRED_MESSAGE,
      );
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lte: expect.any(Date) } },
      });
    });

    test("復号化されたトークンが空の場合はエラーを返す", async () => {
      const mockToken = {
        id: 1,
        accessToken: "encrypted:",
        refreshToken: "encrypted:test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getToken");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        AUTH_REQUIRED_MESSAGE,
      );
    });

    test("データベースエラーの場合はエラーをスロー", async () => {
      mockDbAuthToken.findFirst.mockRejectedValue(new Error("Database error"));

      const handler = mockIpcHandlers.get("auth:getToken");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "認証トークンの取得に失敗しました",
      );
    });
  });

  describe("auth:getProfile", () => {
    test("idTokenから名前とメールを取得できる", async () => {
      const claims = {
        sub: "user-1",
        name: "鈴山英寿",
        email: "user@example.com",
        preferred_username: "hisuzuya",
      };
      const idToken = createJwt(claims);
      const mockToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        idToken: `encrypted:${idToken}`,
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getProfile");
      expect(handler).toBeDefined();

      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toStrictEqual({
        name: "鈴山英寿",
        email: "user@example.com",
        preferredUsername: "hisuzuya",
        subject: "user-1",
      });
    });

    test("idTokenがない場合は表示用クレームをnullで返す", async () => {
      const claims = {
        sub: "user-2",
        name: "山田太郎",
        email: "taro@example.com",
        preferred_username: "taro",
      };
      const accessToken = createJwt(claims);
      const mockToken = {
        id: 1,
        accessToken: `encrypted:${accessToken}`,
        refreshToken: "encrypted:test-refresh-token",
        idToken: null,
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getProfile");
      const result = await handler!({} as IpcMainInvokeEvent);

      expect(result).toStrictEqual({
        name: null,
        email: null,
        preferredUsername: null,
        subject: null,
      });
    });

    test("トークンが存在しない場合はエラーを返す", async () => {
      mockDbAuthToken.findFirst.mockResolvedValue(null);

      const handler = mockIpcHandlers.get("auth:getProfile");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        AUTH_REQUIRED_MESSAGE,
      );
    });

    test("有効期限切れのトークンの場合はエラーを返し、DBから削除する", async () => {
      const expiredToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        idToken: null,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(expiredToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });

      const handler = mockIpcHandlers.get("auth:getProfile");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        AUTH_REQUIRED_MESSAGE,
      );
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lte: expect.any(Date) } },
      });
    });

    test("idToken復号に失敗した場合はエラーを返す", async () => {
      const mockToken = {
        id: 1,
        accessToken: "encrypted:test-access-token",
        refreshToken: "encrypted:test-refresh-token",
        idToken: "invalid-token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const handler = mockIpcHandlers.get("auth:getProfile");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "認証プロファイルの取得に失敗しました",
      );
    });
  });

  describe("auth:cancelLogin", () => {
    test("OAuthManagerが設定されている場合は認証フローをキャンセルする", async () => {
      const mockCancelAuthFlow = vi.fn();
      mockGetOAuthManager.mockReturnValue({
        cancelAuthFlow: mockCancelAuthFlow,
      });

      const handler = mockIpcHandlers.get("auth:cancelLogin");
      expect(handler).toBeDefined();

      await handler!({} as IpcMainInvokeEvent);
      expect(mockCancelAuthFlow).toHaveBeenCalled();
    });

    test("OAuthManagerが未設定でもエラーにならない", () => {
      mockGetOAuthManager.mockReturnValue(null);

      const handler = mockIpcHandlers.get("auth:cancelLogin");
      expect(() => handler!({} as IpcMainInvokeEvent)).not.toThrow();
    });
  });

  describe("auth:isAuthenticated", () => {
    test("有効なトークンが存在する場合はtrueを返す", async () => {
      const mockToken = {
        id: 1,
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
        id: 1,
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

  describe("auth:logoutAndResetProfile", () => {
    test("プロファイルをリセットしてからログアウトする", async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      mockGetOAuthManager.mockReturnValue({ logout: mockLogout });

      const handler = mockIpcHandlers.get("auth:logoutAndResetProfile");
      expect(handler).toBeDefined();

      await handler!({} as IpcMainInvokeEvent);

      expect(resetProfileState).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
      expect(mockSetOAuthManager).toHaveBeenCalledWith(null);
    });

    test("プロファイルリセットに失敗した場合はログアウトしない", async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      mockGetOAuthManager.mockReturnValue({ logout: mockLogout });
      vi.mocked(resetProfileState).mockRejectedValueOnce(
        new Error("profile reset failed"),
      );

      const handler = mockIpcHandlers.get("auth:logoutAndResetProfile");

      await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
        "profile reset failed",
      );
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockSetOAuthManager).not.toHaveBeenCalled();
    });

    test("OAuthManagerが未設定でもプロファイルリセット後にローカルトークンを削除する", async () => {
      mockGetOAuthManager.mockReturnValue(null);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });

      const handler = mockIpcHandlers.get("auth:logoutAndResetProfile");
      await handler!({} as IpcMainInvokeEvent);

      expect(resetProfileState).toHaveBeenCalled();
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
      expect(mockSetOAuthManager).toHaveBeenCalledWith(null);
    });
  });
});
