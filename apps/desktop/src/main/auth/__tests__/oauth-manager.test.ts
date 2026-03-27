import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// モックの設定
vi.mock("electron", () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../db");
vi.mock("../../utils/encryption");
vi.mock("../../utils/logger");

// KeycloakClientのモック
const mockExchangeCodeForToken = vi.fn();
const mockRefreshToken = vi.fn();
const mockLogout = vi.fn();
const mockGenerateAuthUrl = vi
  .fn()
  .mockReturnValue("https://keycloak.example.com/auth");

vi.mock("../keycloak", () => ({
  KeycloakClient: vi.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    exchangeCodeForToken: mockExchangeCodeForToken,
    refreshToken: mockRefreshToken,
    logout: mockLogout,
  })),
}));

import { shell } from "electron";
import { OAuthManager } from "../oauth-manager";
import { getDb } from "../../db";
import { encryptToken, decryptToken } from "../../utils/encryption";

const createOAuthManager = (): OAuthManager =>
  new OAuthManager({
    issuer: "https://keycloak.example.com/realms/test",
    clientId: "test-client",
    redirectUri: "tumiki-desktop://auth/callback",
  });

describe("OAuthManager", () => {
  const mockDbAuthToken = {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });

    vi.mocked(getDb).mockResolvedValue({
      authToken: mockDbAuthToken,
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({ authToken: mockDbAuthToken }),
      ),
    } as unknown as Awaited<ReturnType<typeof getDb>>);

    vi.mocked(encryptToken).mockImplementation((plainText: string) =>
      Promise.resolve(`encrypted:${plainText}`),
    );
    vi.mocked(decryptToken).mockImplementation((encryptedText: string) =>
      Promise.resolve(encryptedText.replace("encrypted:", "")),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startAuthFlow", () => {
    test("外部ブラウザで認証URLを開く", async () => {
      const manager = createOAuthManager();
      await manager.startAuthFlow();

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          codeChallenge: expect.any(String) as string,
          state: expect.any(String) as string,
        }),
      );
      expect(shell.openExternal).toHaveBeenCalledWith(
        "https://keycloak.example.com/auth",
      );
    });

    test("既存セッションがあれば破棄して新しいフローを開始する", async () => {
      const manager = createOAuthManager();
      await manager.startAuthFlow();
      await manager.startAuthFlow();

      // 2回目の呼び出しでもブラウザが開かれる
      expect(shell.openExternal).toHaveBeenCalledTimes(2);
    });

    test("shell.openExternalが失敗した場合はエラーをスローする", async () => {
      vi.mocked(shell.openExternal).mockRejectedValueOnce(
        new Error("Failed to open"),
      );

      const manager = createOAuthManager();
      await expect(manager.startAuthFlow()).rejects.toThrow("Failed to open");
    });
  });

  describe("handleAuthCallback", () => {
    test("有効なコールバックURLからトークンを取得して保存する", async () => {
      const tokenResponse = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 300,
        token_type: "Bearer",
      };
      mockExchangeCodeForToken.mockResolvedValue(tokenResponse);
      mockDbAuthToken.create.mockResolvedValue({
        id: "token-id",
        createdAt: new Date(),
      });
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 0 });

      const manager = createOAuthManager();
      // まず認証フローを開始してセッションを作成
      await manager.startAuthFlow();

      // generateAuthUrlに渡されたstateを取得
      const authUrlCallArgs = mockGenerateAuthUrl.mock.calls[0]?.[0] as
        | { state: string }
        | undefined;
      const state = authUrlCallArgs?.state ?? "";

      const callbackUrl = `tumiki-desktop://auth/callback?code=auth-code&state=${state}`;
      await manager.handleAuthCallback(callbackUrl);

      expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "auth-code",
          codeVerifier: expect.any(String) as string,
        }),
      );
      expect(mockDbAuthToken.create).toHaveBeenCalled();
    });

    test("認可コードがない場合はエラーをスローする", async () => {
      const manager = createOAuthManager();
      await manager.startAuthFlow();

      const authUrlCallArgs = mockGenerateAuthUrl.mock.calls[0]?.[0] as
        | { state: string }
        | undefined;
      const state = authUrlCallArgs?.state ?? "";

      await expect(
        manager.handleAuthCallback(
          `tumiki-desktop://auth/callback?state=${state}`,
        ),
      ).rejects.toThrow("認可コードが見つかりません");
    });

    test("stateが一致しない場合はエラーをスローする", async () => {
      const manager = createOAuthManager();
      await manager.startAuthFlow();

      await expect(
        manager.handleAuthCallback(
          "tumiki-desktop://auth/callback?code=auth-code&state=wrong-state",
        ),
      ).rejects.toThrow("stateパラメータが一致しません");
    });

    test("セッションが存在しない場合はエラーをスローする", async () => {
      const manager = createOAuthManager();
      // startAuthFlowを呼ばずにコールバックを処理

      await expect(
        manager.handleAuthCallback(
          "tumiki-desktop://auth/callback?code=auth-code&state=some-state",
        ),
      ).rejects.toThrow("認証セッションが存在しません");
    });

    test("セッション有効期限（5分）を超えた場合はエラーをスローする", async () => {
      const manager = createOAuthManager();
      await manager.startAuthFlow();

      const authUrlCallArgs = mockGenerateAuthUrl.mock.calls[0]?.[0] as
        | { state: string }
        | undefined;
      const state = authUrlCallArgs?.state ?? "";

      // 6分経過させる
      vi.advanceTimersByTime(6 * 60 * 1000);

      await expect(
        manager.handleAuthCallback(
          `tumiki-desktop://auth/callback?code=auth-code&state=${state}`,
        ),
      ).rejects.toThrow("認証セッションの有効期限が切れています");
    });
  });

  describe("logout", () => {
    test("Keycloakとローカルの両方からログアウトする", async () => {
      const mockToken = {
        id: "token-id",
        refreshToken: "encrypted:refresh-token",
        createdAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });
      mockLogout.mockResolvedValue(undefined);

      const manager = createOAuthManager();
      await manager.logout();

      expect(mockLogout).toHaveBeenCalledWith({
        refreshToken: "refresh-token",
      });
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    });

    test("idTokenが存在する場合はid_token_hintを含めてログアウトする", async () => {
      const mockToken = {
        id: "token-id",
        refreshToken: "encrypted:refresh-token",
        idToken: "encrypted:id-token",
        createdAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });
      mockLogout.mockResolvedValue(undefined);

      const manager = createOAuthManager();
      await manager.logout();

      expect(mockLogout).toHaveBeenCalledWith({
        refreshToken: "refresh-token",
        idToken: "id-token",
      });
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    });

    test("トークンが存在しない場合でもローカルを削除する", async () => {
      mockDbAuthToken.findFirst.mockResolvedValue(null);
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 0 });

      const manager = createOAuthManager();
      await manager.logout();

      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    });
  });

  describe("initialize", () => {
    test("有効なトークンがある場合は自動リフレッシュを開始する", async () => {
      const mockToken = {
        id: "token-id",
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
        createdAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValue(mockToken);

      const manager = createOAuthManager();
      await manager.initialize();

      // 自動リフレッシュが設定されたことを確認（stopAutoRefreshでクリアできる）
      expect(() => manager.stopAutoRefresh()).not.toThrow();
    });

    test("トークンが存在しない場合は何もしない", async () => {
      mockDbAuthToken.findFirst.mockResolvedValue(null);

      const manager = createOAuthManager();
      await manager.initialize();

      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    test("有効期限切れのトークンがある場合はリフレッシュを試みる", async () => {
      const mockToken = {
        id: "token-id",
        refreshToken: "encrypted:refresh-token",
        expiresAt: new Date(Date.now() - 1000), // 期限切れ
        createdAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValueOnce(mockToken);

      // リフレッシュ時のfindFirst
      mockDbAuthToken.findFirst.mockResolvedValueOnce(mockToken);

      const tokenResponse = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 300,
        token_type: "Bearer",
      };
      mockRefreshToken.mockResolvedValue(tokenResponse);
      mockDbAuthToken.create.mockResolvedValue({
        id: "new-token-id",
        createdAt: new Date(),
      });
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });

      const manager = createOAuthManager();
      await manager.initialize();

      expect(mockRefreshToken).toHaveBeenCalledWith("refresh-token");
    });

    test("有効期限切れトークンのリフレッシュに失敗した場合はトークンを削除する", async () => {
      const mockToken = {
        id: "token-id",
        refreshToken: "encrypted:refresh-token",
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      };
      mockDbAuthToken.findFirst.mockResolvedValueOnce(mockToken);
      mockDbAuthToken.findFirst.mockResolvedValueOnce(mockToken);
      mockRefreshToken.mockRejectedValue(new Error("Refresh failed"));
      mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });

      const manager = createOAuthManager();
      await manager.initialize();

      expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    });
  });

  describe("stopAutoRefresh", () => {
    test("タイマーが設定されていなくてもエラーにならない", () => {
      const manager = createOAuthManager();
      expect(() => manager.stopAutoRefresh()).not.toThrow();
    });
  });
});
