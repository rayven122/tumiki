/**
 * oauth-token-manager.ts のテスト
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

import { ReAuthRequiredError } from "../types.js";

// モジュールモック
vi.mock("../token-cache.js", () => ({
  getFromCache: vi.fn(),
  cacheToken: vi.fn(),
  getCacheKey: vi.fn(),
  invalidateCache: vi.fn(),
}));

vi.mock("../token-repository.js", () => ({
  getTokenFromDB: vi.fn(),
}));

vi.mock("../token-refresh.js", () => ({
  refreshBackendToken: vi.fn(),
}));

vi.mock("../token-validator.js", () => ({
  isExpiringSoon: vi.fn(),
  isTokenExpired: vi.fn(),
  toDecryptedToken: vi.fn(),
}));

// loggerをモックしてコンソール出力を抑制
vi.mock("../logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockDecryptedToken = {
  id: "token-id-1",
  accessToken: "valid-access-token",
  refreshToken: "valid-refresh-token",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  oauthClientId: "client-id-1",
};

const mockDbToken = {
  id: "token-id-1",
  accessToken: "valid-access-token",
  refreshToken: "valid-refresh-token",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  oauthClient: {
    id: "client-id-1",
  },
};

const mockRefreshedToken = {
  id: "token-id-1",
  accessToken: "refreshed-access-token",
  refreshToken: "refreshed-refresh-token",
  expiresAt: new Date(Date.now() + 7200 * 1000),
  oauthClientId: "client-id-1",
};

describe("getValidToken", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { getCacheKey } = await import("../token-cache.js");
    vi.mocked(getCacheKey).mockReturnValue(
      "backend_token:user-id-1:instance-id-1",
    );
  });

  test("Redisキャッシュにトークンがある場合はキャッシュから返す", async () => {
    const { getFromCache } = await import("../token-cache.js");
    vi.mocked(getFromCache).mockResolvedValue(mockDecryptedToken);

    const { getValidToken } = await import("../oauth-token-manager.js");
    const result = await getValidToken("instance-id-1", "user-id-1");

    expect(result).toStrictEqual(mockDecryptedToken);

    // キャッシュがヒットした場合はDBアクセスしない
    const { getTokenFromDB } = await import("../token-repository.js");
    expect(vi.mocked(getTokenFromDB)).not.toHaveBeenCalled();
  });

  test("トークンが存在しない場合はReAuthRequiredErrorを投げる", async () => {
    const { getFromCache } = await import("../token-cache.js");
    vi.mocked(getFromCache).mockResolvedValue(null);

    const { getTokenFromDB } = await import("../token-repository.js");
    vi.mocked(getTokenFromDB).mockResolvedValue(null);

    const { getValidToken } = await import("../oauth-token-manager.js");

    await expect(
      getValidToken("instance-id-1", "user-id-1"),
    ).rejects.toBeInstanceOf(ReAuthRequiredError);
  });

  test("リフレッシュが成功した場合はリフレッシュ後のトークンを返す", async () => {
    const { getFromCache, cacheToken } = await import("../token-cache.js");
    vi.mocked(getFromCache).mockResolvedValue(null);
    vi.mocked(cacheToken).mockResolvedValue(undefined);

    const { getTokenFromDB } = await import("../token-repository.js");
    vi.mocked(getTokenFromDB).mockResolvedValue(mockDbToken as never);

    const { isExpiringSoon, isTokenExpired } =
      await import("../token-validator.js");
    // 期限切れ間近でリフレッシュが必要
    vi.mocked(isTokenExpired).mockReturnValue(false);
    vi.mocked(isExpiringSoon).mockReturnValue(true);

    const { refreshBackendToken } = await import("../token-refresh.js");
    vi.mocked(refreshBackendToken).mockResolvedValue(mockRefreshedToken);

    const { getValidToken } = await import("../oauth-token-manager.js");
    const result = await getValidToken("instance-id-1", "user-id-1");

    expect(result).toStrictEqual(mockRefreshedToken);
    expect(vi.mocked(cacheToken)).toHaveBeenCalledWith(
      "backend_token:user-id-1:instance-id-1",
      mockRefreshedToken,
    );
  });

  test("トークンが期限切れ間近でリフレッシュが失敗した場合は有効なトークンを継続して返す", async () => {
    const { getFromCache, cacheToken } = await import("../token-cache.js");
    vi.mocked(getFromCache).mockResolvedValue(null);
    vi.mocked(cacheToken).mockResolvedValue(undefined);

    const { getTokenFromDB } = await import("../token-repository.js");
    vi.mocked(getTokenFromDB).mockResolvedValue(mockDbToken as never);

    const { isExpiringSoon, isTokenExpired, toDecryptedToken } =
      await import("../token-validator.js");
    // 期限切れ間近だが、まだ有効（expired=false, expiringSoon=true）
    vi.mocked(isTokenExpired).mockReturnValue(false);
    vi.mocked(isExpiringSoon).mockReturnValue(true);
    vi.mocked(toDecryptedToken).mockReturnValue(mockDecryptedToken);

    const { refreshBackendToken } = await import("../token-refresh.js");
    vi.mocked(refreshBackendToken).mockRejectedValue(
      new Error("refresh failed"),
    );

    const { getValidToken } = await import("../oauth-token-manager.js");
    const result = await getValidToken("instance-id-1", "user-id-1");

    // リフレッシュに失敗しても現在のトークンを返す
    expect(result).toStrictEqual(mockDecryptedToken);
    expect(vi.mocked(cacheToken)).toHaveBeenCalledWith(
      "backend_token:user-id-1:instance-id-1",
      mockDecryptedToken,
    );
  });

  test("トークンが期限切れかつリフレッシュが失敗した場合はReAuthRequiredErrorを投げる", async () => {
    const { getFromCache } = await import("../token-cache.js");
    vi.mocked(getFromCache).mockResolvedValue(null);

    const { getTokenFromDB } = await import("../token-repository.js");
    vi.mocked(getTokenFromDB).mockResolvedValue(mockDbToken as never);

    const { isExpiringSoon, isTokenExpired } =
      await import("../token-validator.js");
    // 完全に期限切れ
    vi.mocked(isTokenExpired).mockReturnValue(true);
    vi.mocked(isExpiringSoon).mockReturnValue(true);

    const { refreshBackendToken } = await import("../token-refresh.js");
    vi.mocked(refreshBackendToken).mockRejectedValue(
      new Error("refresh failed"),
    );

    const { getValidToken } = await import("../oauth-token-manager.js");

    await expect(
      getValidToken("instance-id-1", "user-id-1"),
    ).rejects.toBeInstanceOf(ReAuthRequiredError);
  });

  test("トークンが有効でリフレッシュ不要の場合はキャッシュに保存して返す", async () => {
    const { getFromCache, cacheToken } = await import("../token-cache.js");
    vi.mocked(getFromCache).mockResolvedValue(null);
    vi.mocked(cacheToken).mockResolvedValue(undefined);

    const { getTokenFromDB } = await import("../token-repository.js");
    vi.mocked(getTokenFromDB).mockResolvedValue(mockDbToken as never);

    const { isExpiringSoon, isTokenExpired, toDecryptedToken } =
      await import("../token-validator.js");
    // 期限切れでも期限切れ間近でもない
    vi.mocked(isTokenExpired).mockReturnValue(false);
    vi.mocked(isExpiringSoon).mockReturnValue(false);
    vi.mocked(toDecryptedToken).mockReturnValue(mockDecryptedToken);

    const { getValidToken } = await import("../oauth-token-manager.js");
    const result = await getValidToken("instance-id-1", "user-id-1");

    expect(result).toStrictEqual(mockDecryptedToken);
    expect(vi.mocked(cacheToken)).toHaveBeenCalledWith(
      "backend_token:user-id-1:instance-id-1",
      mockDecryptedToken,
    );
  });
});

describe("refreshBackendToken", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  test("内部のrefreshTokenを呼び出してリフレッシュされたトークンを返す", async () => {
    const { refreshBackendToken: refreshTokenMock } =
      await import("../token-refresh.js");
    vi.mocked(refreshTokenMock).mockResolvedValue(mockRefreshedToken);

    const { refreshBackendToken } = await import("../oauth-token-manager.js");
    const result = await refreshBackendToken("token-id-1");

    expect(result).toStrictEqual(mockRefreshedToken);
    expect(vi.mocked(refreshTokenMock)).toHaveBeenCalledWith("token-id-1");
  });
});

describe("invalidateCache", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  test("内部のinvalidateCacheを呼び出してキャッシュを無効化する", async () => {
    const { invalidateCache: invalidateCacheMock } =
      await import("../token-cache.js");
    vi.mocked(invalidateCacheMock).mockResolvedValue(undefined);

    const { invalidateCache } = await import("../oauth-token-manager.js");
    await invalidateCache("user-id-1", "template-id-1");

    expect(vi.mocked(invalidateCacheMock)).toHaveBeenCalledWith(
      "user-id-1",
      "template-id-1",
    );
  });
});
