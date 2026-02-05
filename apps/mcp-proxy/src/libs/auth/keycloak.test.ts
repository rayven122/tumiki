import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getKeycloakIssuer,
  getKeycloakServerMetadata,
  getJWKS,
  clearKeycloakCache,
  getKeycloakCacheStatus,
  isLocalhostUrl,
  createKeycloakConfiguration,
} from "./keycloak.js";

// vi.hoisted を使用してモック関数を先に定義（ホイスティング問題を回避）
const {
  mockDiscovery,
  mockCreateRemoteJWKSet,
  mockAllowInsecureRequests,
  MockConfiguration,
} = vi.hoisted(() => ({
  mockDiscovery: vi.fn(),
  mockCreateRemoteJWKSet: vi.fn(() => "mocked-jwks"),
  mockAllowInsecureRequests: vi.fn(),
  MockConfiguration: vi.fn(),
}));

// openid-client v6 をモック
vi.mock("openid-client", () => ({
  discovery: mockDiscovery,
  Configuration: MockConfiguration,
  ClientSecretPost: vi.fn(() => "client_secret_post"),
  None: vi.fn(() => "none"),
  allowInsecureRequests: mockAllowInsecureRequests,
}));

// jose の createRemoteJWKSet をモック
vi.mock("jose", () => ({
  createRemoteJWKSet: mockCreateRemoteJWKSet,
}));

// テスト用の ServerMetadata
const mockServerMetadata = {
  issuer: "https://keycloak.example.com/realms/test",
  jwks_uri:
    "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
  token_endpoint:
    "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
};

// モック Configuration オブジェクトを作成するヘルパー
// 引数なしの場合は mockServerMetadata を使用、引数ありの場合は任意の型を受け入れる
const createMockConfiguration = <T = typeof mockServerMetadata>(
  metadata?: T,
) => ({
  serverMetadata: () => metadata ?? mockServerMetadata,
});

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

describe("getKeycloakServerMetadata", () => {
  test("環境変数が設定されていない場合はエラーをスローする", async () => {
    delete process.env.KEYCLOAK_ISSUER;

    await expect(getKeycloakServerMetadata()).rejects.toThrow(
      "KEYCLOAK_ISSUER environment variable is not set",
    );
  });

  test("Discovery を実行して ServerMetadata を返す", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    const result = await getKeycloakServerMetadata();

    // v6: discovery() は URL オブジェクトと clientId を受け取る
    // HTTPS URL の場合は execute オプションなし（undefined）
    expect(mockDiscovery).toHaveBeenCalledWith(
      new URL("https://keycloak.example.com/realms/test"),
      "__metadata_only__",
      undefined, // clientMetadata
      undefined, // clientAuth
      undefined, // executeOptions（HTTPS なので不要）
    );
    expect(result).toStrictEqual(mockServerMetadata);
  });

  test("2回目以降の呼び出しではキャッシュを使用する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValue(createMockConfiguration());

    // 1回目の呼び出し
    const result1 = await getKeycloakServerMetadata();
    // 2回目の呼び出し
    const result2 = await getKeycloakServerMetadata();

    // discovery() は1回だけ呼ばれる
    expect(mockDiscovery).toHaveBeenCalledTimes(1);
    expect(result1).toStrictEqual(result2);
  });
});

describe("getKeycloakIssuer（後方互換性）", () => {
  test("issuer と metadata を含むオブジェクトを返す", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    const result = await getKeycloakIssuer();

    expect(result.issuer).toBe("https://keycloak.example.com/realms/test");
    expect(result.metadata).toStrictEqual(mockServerMetadata);
  });
});

describe("getJWKS", () => {
  test("ServerMetadata から jwks_uri が取得できない場合はエラーをスローする", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    const metadataWithoutJwks = {
      issuer: "https://keycloak.example.com/realms/test",
      jwks_uri: undefined,
      token_endpoint:
        "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
    };

    mockDiscovery.mockResolvedValueOnce(
      createMockConfiguration(metadataWithoutJwks),
    );

    await expect(getJWKS()).rejects.toThrow(
      "JWKS URI not found in Keycloak metadata",
    );
  });

  test("JWKS を取得して返す", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    const result = await getJWKS();

    expect(result).toStrictEqual("mocked-jwks");
  });

  test("2回目以降の呼び出しではキャッシュを使用する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValue(createMockConfiguration());

    // 1回目の呼び出し
    const result1 = await getJWKS();
    // 2回目の呼び出し
    const result2 = await getJWKS();

    // discovery() は1回だけ呼ばれる（getJWKS 内で getKeycloakServerMetadata を呼ぶため）
    expect(mockDiscovery).toHaveBeenCalledTimes(1);
    expect(result1).toStrictEqual(result2);
  });
});

describe("clearKeycloakCache", () => {
  test("キャッシュをクリアすると次回呼び出しで再取得する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValue(createMockConfiguration());

    // 1回目の呼び出し
    await getKeycloakServerMetadata();
    expect(mockDiscovery).toHaveBeenCalledTimes(1);

    // キャッシュをクリア
    clearKeycloakCache();

    // 2回目の呼び出し（キャッシュクリア後）
    await getKeycloakServerMetadata();
    expect(mockDiscovery).toHaveBeenCalledTimes(2);
  });
});

describe("getKeycloakCacheStatus", () => {
  test("初期状態では全てのフラグが false", () => {
    const status = getKeycloakCacheStatus();

    expect(status).toStrictEqual({
      hasMetadataCache: false,
      hasJwksCache: false,
      isDiscovering: false,
      isCreatingJwks: false,
    });
  });

  test("ServerMetadata キャッシュ後は hasMetadataCache が true", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    await getKeycloakServerMetadata();

    const status = getKeycloakCacheStatus();
    expect(status.hasMetadataCache).toBe(true);
    expect(status.hasJwksCache).toBe(false);
  });

  test("JWKS キャッシュ後は hasJwksCache が true", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    await getJWKS();

    const status = getKeycloakCacheStatus();
    expect(status.hasMetadataCache).toBe(true);
    expect(status.hasJwksCache).toBe(true);
  });
});

describe("競合状態テスト", () => {
  test("並行リクエスト時に Discovery は1回のみ実行される", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    let resolveDiscovery: ((value: unknown) => void) | null = null;

    // Promise を手動で解決できるようにする
    mockDiscovery.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveDiscovery = resolve;
      });
    });

    // 並行で3回呼び出し（Promise は未解決のまま）
    const promise1 = getKeycloakServerMetadata();
    const promise2 = getKeycloakServerMetadata();
    const promise3 = getKeycloakServerMetadata();

    // discovery() は1回だけ呼ばれる（競合状態が防止されている）
    expect(mockDiscovery).toHaveBeenCalledTimes(1);

    // Discovery 中の状態を確認
    const statusDuring = getKeycloakCacheStatus();
    expect(statusDuring.isDiscovering).toBe(true);
    expect(statusDuring.hasMetadataCache).toBe(false);

    // Promise を解決
    resolveDiscovery!(createMockConfiguration());

    // 全ての Promise が同じ結果を返す
    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);
    expect(result1).toStrictEqual(result2);
    expect(result2).toStrictEqual(result3);
    expect(result1).toStrictEqual(mockServerMetadata);

    // Discovery 完了後の状態を確認
    const statusAfter = getKeycloakCacheStatus();
    expect(statusAfter.isDiscovering).toBe(false);
    expect(statusAfter.hasMetadataCache).toBe(true);
  });

  test("並行リクエスト時に JWKS 作成は1回のみ実行される", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    let resolveDiscovery: ((value: unknown) => void) | null = null;

    // Promise を手動で解決できるようにする
    mockDiscovery.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveDiscovery = resolve;
      });
    });

    // 並行で3回呼び出し
    const promise1 = getJWKS();
    const promise2 = getJWKS();
    const promise3 = getJWKS();

    // discovery() は1回だけ呼ばれる
    expect(mockDiscovery).toHaveBeenCalledTimes(1);

    // Promise を解決
    resolveDiscovery!(createMockConfiguration());

    // 全ての Promise が同じ結果を返す
    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);

    // JWKS 作成完了後の状態を確認
    const statusAfter = getKeycloakCacheStatus();
    expect(statusAfter.hasJwksCache).toBe(true);
    expect(statusAfter.isCreatingJwks).toBe(false);
  });

  test("Discovery エラー時は次回再試行する", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    // 1回目はエラー、2回目は成功
    mockDiscovery
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(createMockConfiguration());

    // 1回目: エラー
    await expect(getKeycloakServerMetadata()).rejects.toThrow("Network error");

    // エラー後はキャッシュなし、Discovery 中でもない
    const statusAfterError = getKeycloakCacheStatus();
    expect(statusAfterError.hasMetadataCache).toBe(false);
    expect(statusAfterError.isDiscovering).toBe(false);

    // 2回目: 成功（再試行される）
    const result = await getKeycloakServerMetadata();
    expect(result).toStrictEqual(mockServerMetadata);
    expect(mockDiscovery).toHaveBeenCalledTimes(2);

    // 成功後はキャッシュあり
    const statusAfterSuccess = getKeycloakCacheStatus();
    expect(statusAfterSuccess.hasMetadataCache).toBe(true);
  });
});

describe("isLocalhostUrl", () => {
  test("localhost URLの場合はtrueを返す", () => {
    expect(isLocalhostUrl("http://localhost:8080/realms/test")).toBe(true);
  });

  test("127.0.0.1 URLの場合はtrueを返す", () => {
    expect(isLocalhostUrl("http://127.0.0.1:8080/realms/test")).toBe(true);
  });

  test("外部URLの場合はfalseを返す", () => {
    expect(isLocalhostUrl("https://keycloak.example.com/realms/test")).toBe(
      false,
    );
  });

  test("無効なURLの場合はfalseを返す", () => {
    expect(isLocalhostUrl("not-a-url")).toBe(false);
  });
});

describe("discoverMetadata（localhost）", () => {
  test("localhost URLの場合はallowInsecureRequestsオプションが渡される", async () => {
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    await getKeycloakServerMetadata();

    // localhost の場合は execute オプションに allowInsecureRequests が含まれる
    expect(mockDiscovery).toHaveBeenCalledWith(
      new URL("http://localhost:8080/realms/test"),
      "__metadata_only__",
      undefined,
      undefined,
      { execute: [mockAllowInsecureRequests] },
    );
  });
});

describe("createKeycloakConfiguration", () => {
  test("localhost URLの場合はallowInsecureRequestsが呼ばれる", async () => {
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/test";

    // Discovery のモック
    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    // Configuration コンストラクタのモック
    const mockConfigInstance = {};
    MockConfiguration.mockReturnValueOnce(mockConfigInstance);

    const result = await createKeycloakConfiguration("test-client", "secret");

    expect(result).toBe(mockConfigInstance);
    // localhost の場合は allowInsecureRequests が config に対して呼ばれる
    expect(mockAllowInsecureRequests).toHaveBeenCalledWith(mockConfigInstance);
  });

  test("HTTPS URLの場合はallowInsecureRequestsが呼ばれない", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    const mockConfigInstance = {};
    MockConfiguration.mockReturnValueOnce(mockConfigInstance);

    await createKeycloakConfiguration("test-client", "secret");

    expect(mockAllowInsecureRequests).not.toHaveBeenCalled();
  });

  test("KEYCLOAK_ISSUERが未設定の場合はallowInsecureRequestsが呼ばれない", async () => {
    // KEYCLOAK_ISSUER を削除して ?? "" のフォールバックブランチをテスト
    delete process.env.KEYCLOAK_ISSUER;

    // getKeycloakServerMetadata が先にキャッシュからメタデータを返すように、
    // 事前にキャッシュを設定しておく
    // まず KEYCLOAK_ISSUER を設定して discovery を成功させる
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";
    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());
    await getKeycloakServerMetadata();

    // KEYCLOAK_ISSUER を削除（createKeycloakConfiguration 内で ?? "" が使われる）
    delete process.env.KEYCLOAK_ISSUER;

    const mockConfigInstance = {};
    MockConfiguration.mockReturnValueOnce(mockConfigInstance);

    await createKeycloakConfiguration("test-client", "secret");

    // isLocalhostUrl("") は false を返すため、allowInsecureRequests は呼ばれない
    expect(mockAllowInsecureRequests).not.toHaveBeenCalled();
  });

  test("clientSecretなしの場合はNone()が使用される（Public Client）", async () => {
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/test";

    mockDiscovery.mockResolvedValueOnce(createMockConfiguration());

    const mockConfigInstance = {};
    MockConfiguration.mockReturnValueOnce(mockConfigInstance);

    await createKeycloakConfiguration("public-client");

    // clientSecret が undefined の場合は None() が使われる
    expect(MockConfiguration).toHaveBeenCalledWith(
      mockServerMetadata,
      "public-client",
      undefined,
      "none", // None() の戻り値
    );
  });
});
