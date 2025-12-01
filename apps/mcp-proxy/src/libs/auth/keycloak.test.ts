import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Issuer } from "openid-client";
import {
  getKeycloakIssuer,
  getJWKS,
  clearKeycloakCache,
  getKeycloakCacheStatus,
} from "./keycloak.js";

// vi.hoistedを使用してモック関数を先に定義（ホイスティング問題を回避）
const { mockDiscover, mockCreateRemoteJWKSet } = vi.hoisted(() => ({
  mockDiscover: vi.fn(),
  mockCreateRemoteJWKSet: vi.fn(() => "mocked-jwks"),
}));

// openid-client の Issuer をモック
vi.mock("openid-client", () => ({
  Issuer: {
    discover: mockDiscover,
  },
}));

// jose の createRemoteJWKSet をモック
vi.mock("jose", () => ({
  createRemoteJWKSet: mockCreateRemoteJWKSet,
}));

// 環境変数のバックアップ
let originalKeycloakIssuer: string | undefined;

beforeEach(() => {
  // テスト前に環境変数をバックアップしてキャッシュをクリア
  originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;
  clearKeycloakCache();
  vi.clearAllMocks();
});

afterEach(() => {
  // テスト後に環境変数を復元
  if (originalKeycloakIssuer !== undefined) {
    process.env.KEYCLOAK_ISSUER = originalKeycloakIssuer;
  } else {
    delete process.env.KEYCLOAK_ISSUER;
  }
  clearKeycloakCache();
});

describe("getKeycloakIssuer", () => {
  test("環境変数が設定されていない場合はエラーをスローする", async () => {
    delete process.env.KEYCLOAK_ISSUER;

    await expect(getKeycloakIssuer()).rejects.toThrow(
      "KEYCLOAK_ISSUER environment variable is not set",
    );
  });

  test("Issuer Discoveryを実行してIssuerを返す", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValueOnce(mockIssuer as unknown as Issuer);

    const result = await getKeycloakIssuer();

    expect(mockDiscover).toHaveBeenCalledWith(
      "https://keycloak.example.com/realms/test",
    );
    expect(result).toStrictEqual(mockIssuer);
  });

  test("2回目以降の呼び出しではキャッシュを使用する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValue(mockIssuer as unknown as Issuer);

    // 1回目の呼び出し
    const result1 = await getKeycloakIssuer();
    // 2回目の呼び出し
    const result2 = await getKeycloakIssuer();

    // Issuer.discoverは1回だけ呼ばれる
    expect(mockDiscover).toHaveBeenCalledTimes(1);
    expect(result1).toStrictEqual(result2);
  });
});

describe("getJWKS", () => {
  test("Issuerからjwks_uriが取得できない場合はエラーをスローする", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri: undefined,
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValueOnce(mockIssuer as unknown as Issuer);

    await expect(getJWKS()).rejects.toThrow(
      "JWKS URI not found in Keycloak metadata",
    );
  });

  test("JWKSを取得して返す", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValueOnce(mockIssuer as unknown as Issuer);

    const result = await getJWKS();

    expect(result).toStrictEqual("mocked-jwks");
  });

  test("2回目以降の呼び出しではキャッシュを使用する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValue(mockIssuer as unknown as Issuer);

    // 1回目の呼び出し
    const result1 = await getJWKS();
    // 2回目の呼び出し
    const result2 = await getJWKS();

    // Issuer.discoverは1回だけ呼ばれる（getJWKS内でgetKeycloakIssuerを呼ぶため）
    expect(mockDiscover).toHaveBeenCalledTimes(1);
    expect(result1).toStrictEqual(result2);
  });
});

describe("clearKeycloakCache", () => {
  test("キャッシュをクリアすると次回呼び出しで再取得する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValue(mockIssuer as unknown as Issuer);

    // 1回目の呼び出し
    await getKeycloakIssuer();
    expect(mockDiscover).toHaveBeenCalledTimes(1);

    // キャッシュをクリア
    clearKeycloakCache();

    // 2回目の呼び出し（キャッシュクリア後）
    await getKeycloakIssuer();
    expect(mockDiscover).toHaveBeenCalledTimes(2);
  });
});

describe("getKeycloakCacheStatus", () => {
  test("初期状態では全てのフラグがfalse", () => {
    const status = getKeycloakCacheStatus();

    expect(status).toStrictEqual({
      hasIssuerCache: false,
      hasJwksCache: false,
      isDiscovering: false,
      isCreatingJwks: false,
    });
  });

  test("Issuerキャッシュ後はhasIssuerCacheがtrue", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValueOnce(mockIssuer as unknown as Issuer);

    await getKeycloakIssuer();

    const status = getKeycloakCacheStatus();
    expect(status.hasIssuerCache).toBe(true);
    expect(status.hasJwksCache).toBe(false);
  });

  test("JWKSキャッシュ後はhasJwksCacheがtrue", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    mockDiscover.mockResolvedValueOnce(mockIssuer as unknown as Issuer);

    await getJWKS();

    const status = getKeycloakCacheStatus();
    expect(status.hasIssuerCache).toBe(true);
    expect(status.hasJwksCache).toBe(true);
  });
});

describe("競合状態テスト", () => {
  test("並行リクエスト時にIssuer Discoveryは1回のみ実行される", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    let resolveDiscover: ((value: unknown) => void) | null = null;

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    // Promiseを手動で解決できるようにする
    mockDiscover.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveDiscover = resolve;
      });
    });

    // 並行で3回呼び出し（Promiseは未解決のまま）
    const promise1 = getKeycloakIssuer();
    const promise2 = getKeycloakIssuer();
    const promise3 = getKeycloakIssuer();

    // Discoveryは1回だけ呼ばれる（競合状態が防止されている）
    expect(mockDiscover).toHaveBeenCalledTimes(1);

    // Discovery中の状態を確認
    const statusDuring = getKeycloakCacheStatus();
    expect(statusDuring.isDiscovering).toBe(true);
    expect(statusDuring.hasIssuerCache).toBe(false);

    // Promiseを解決
    resolveDiscover!(mockIssuer);

    // 全てのPromiseが同じ結果を返す
    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toStrictEqual(mockIssuer);

    // Discovery完了後の状態を確認
    const statusAfter = getKeycloakCacheStatus();
    expect(statusAfter.isDiscovering).toBe(false);
    expect(statusAfter.hasIssuerCache).toBe(true);
  });

  test("並行リクエスト時にJWKS作成は1回のみ実行される", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    let resolveDiscover: ((value: unknown) => void) | null = null;

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    // Promiseを手動で解決できるようにする
    mockDiscover.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveDiscover = resolve;
      });
    });

    // 並行で3回呼び出し
    const promise1 = getJWKS();
    const promise2 = getJWKS();
    const promise3 = getJWKS();

    // Issuer Discoveryは1回だけ呼ばれる
    expect(mockDiscover).toHaveBeenCalledTimes(1);

    // Promiseを解決
    resolveDiscover!(mockIssuer);

    // 全てのPromiseが同じ結果を返す
    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);

    // JWKS作成完了後の状態を確認
    const statusAfter = getKeycloakCacheStatus();
    expect(statusAfter.hasJwksCache).toBe(true);
    expect(statusAfter.isCreatingJwks).toBe(false);
  });

  test("Discoveryエラー時は次回再試行する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const mockIssuer = {
      issuer: "https://keycloak.example.com/realms/test",
      metadata: {
        issuer: "https://keycloak.example.com/realms/test",
        jwks_uri:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
        token_endpoint:
          "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
      },
    };

    // 1回目はエラー、2回目は成功
    mockDiscover
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockIssuer as unknown as Issuer);

    // 1回目: エラー
    await expect(getKeycloakIssuer()).rejects.toThrow("Network error");

    // エラー後はキャッシュなし、Discovery中でもない
    const statusAfterError = getKeycloakCacheStatus();
    expect(statusAfterError.hasIssuerCache).toBe(false);
    expect(statusAfterError.isDiscovering).toBe(false);

    // 2回目: 成功（再試行される）
    const result = await getKeycloakIssuer();
    expect(result).toStrictEqual(mockIssuer);
    expect(mockDiscover).toHaveBeenCalledTimes(2);

    // 成功後はキャッシュあり
    const statusAfterSuccess = getKeycloakCacheStatus();
    expect(statusAfterSuccess.hasIssuerCache).toBe(true);
  });
});
