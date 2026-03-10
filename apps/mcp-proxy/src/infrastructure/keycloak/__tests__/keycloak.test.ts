import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getKeycloakIssuer,
  getKeycloakServerMetadata,
  getJWKS,
  clearKeycloakCache,
  getKeycloakCacheStatus,
  isLocalhostUrl,
  createKeycloakConfiguration,
} from "../keycloakConfig.js";

// モック関数を事前定義
const mocks = vi.hoisted(() => ({
  discovery: vi.fn(),
  createRemoteJWKSet: vi.fn(() => "mocked-jwks"),
  allowInsecureRequests: vi.fn(),
  Configuration: vi.fn(),
}));

// 外部ライブラリをモック
vi.mock("openid-client", () => ({
  discovery: mocks.discovery,
  Configuration: mocks.Configuration,
  ClientSecretPost: vi.fn(() => "client_secret_post"),
  None: vi.fn(() => "none"),
  allowInsecureRequests: mocks.allowInsecureRequests,
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: mocks.createRemoteJWKSet,
}));

// テスト用の ServerMetadata
const mockServerMetadata = {
  issuer: "https://keycloak.example.com/realms/test",
  jwks_uri:
    "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
  token_endpoint:
    "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
};

// モック Configuration 生成ヘルパー
const createMockConfiguration = (
  metadata: Record<string, unknown> = mockServerMetadata,
) => ({
  serverMetadata: () => metadata,
});

beforeEach(() => {
  clearKeycloakCache();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearKeycloakCache();
});

describe("getKeycloakServerMetadata", () => {
  test("環境変数が設定されていない場合はエラーをスローする", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "");

    await expect(getKeycloakServerMetadata()).rejects.toThrow(
      "KEYCLOAK_ISSUER environment variable is not set",
    );
  });

  test("Discovery を実行して ServerMetadata を返す", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    const result = await getKeycloakServerMetadata();

    // HTTPS URLの場合はexecuteオプションなし
    expect(mocks.discovery).toHaveBeenCalledWith(
      new URL("https://keycloak.example.com/realms/test"),
      "__metadata_only__",
      undefined,
      undefined,
      undefined,
    );
    expect(result).toStrictEqual(mockServerMetadata);
  });

  test("2回目以降の呼び出しではキャッシュを使用する", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValue(createMockConfiguration());

    const result1 = await getKeycloakServerMetadata();
    const result2 = await getKeycloakServerMetadata();

    expect(mocks.discovery).toHaveBeenCalledTimes(1);
    expect(result1).toStrictEqual(result2);
  });
});

describe("getKeycloakIssuer（後方互換性）", () => {
  test("issuer と metadata を含むオブジェクトを返す", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    const result = await getKeycloakIssuer();

    expect(result.issuer).toBe("https://keycloak.example.com/realms/test");
    expect(result.metadata).toStrictEqual(mockServerMetadata);
  });
});

describe("getJWKS", () => {
  test("ServerMetadata から jwks_uri が取得できない場合はエラーをスローする", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    const metadataWithoutJwks = {
      issuer: "https://keycloak.example.com/realms/test",
      jwks_uri: undefined,
      token_endpoint:
        "https://keycloak.example.com/realms/test/protocol/openid-connect/token",
    };

    mocks.discovery.mockResolvedValueOnce(
      createMockConfiguration(metadataWithoutJwks),
    );

    await expect(getJWKS()).rejects.toThrow(
      "JWKS URI not found in Keycloak metadata",
    );
  });

  test("JWKS を取得して返す", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    const result = await getJWKS();

    expect(result).toStrictEqual("mocked-jwks");
  });

  test("2回目以降の呼び出しではキャッシュを使用する", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValue(createMockConfiguration());

    const result1 = await getJWKS();
    const result2 = await getJWKS();

    expect(mocks.discovery).toHaveBeenCalledTimes(1);
    expect(result1).toStrictEqual(result2);
  });
});

describe("clearKeycloakCache", () => {
  test("キャッシュをクリアすると次回呼び出しで再取得する", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValue(createMockConfiguration());

    await getKeycloakServerMetadata();
    expect(mocks.discovery).toHaveBeenCalledTimes(1);

    clearKeycloakCache();

    await getKeycloakServerMetadata();
    expect(mocks.discovery).toHaveBeenCalledTimes(2);
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
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    await getKeycloakServerMetadata();

    const status = getKeycloakCacheStatus();
    expect(status.hasMetadataCache).toBe(true);
    expect(status.hasJwksCache).toBe(false);
  });

  test("JWKS キャッシュ後は hasJwksCache が true", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    await getJWKS();

    const status = getKeycloakCacheStatus();
    expect(status.hasMetadataCache).toBe(true);
    expect(status.hasJwksCache).toBe(true);
  });
});

describe("競合状態テスト", () => {
  test("並行リクエスト時に Discovery は1回のみ実行される", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    let resolveDiscovery: ((value: unknown) => void) | null = null;

    mocks.discovery.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDiscovery = resolve;
        }),
    );

    const promise1 = getKeycloakServerMetadata();
    const promise2 = getKeycloakServerMetadata();
    const promise3 = getKeycloakServerMetadata();

    expect(mocks.discovery).toHaveBeenCalledTimes(1);

    const statusDuring = getKeycloakCacheStatus();
    expect(statusDuring.isDiscovering).toBe(true);
    expect(statusDuring.hasMetadataCache).toBe(false);

    resolveDiscovery!(createMockConfiguration());

    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);
    expect(result1).toStrictEqual(result2);
    expect(result2).toStrictEqual(result3);
    expect(result1).toStrictEqual(mockServerMetadata);

    const statusAfter = getKeycloakCacheStatus();
    expect(statusAfter.isDiscovering).toBe(false);
    expect(statusAfter.hasMetadataCache).toBe(true);
  });

  test("並行リクエスト時に JWKS 作成は1回のみ実行される", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    let resolveDiscovery: ((value: unknown) => void) | null = null;

    mocks.discovery.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDiscovery = resolve;
        }),
    );

    const promise1 = getJWKS();
    const promise2 = getJWKS();
    const promise3 = getJWKS();

    expect(mocks.discovery).toHaveBeenCalledTimes(1);

    resolveDiscovery!(createMockConfiguration());

    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);

    const statusAfter = getKeycloakCacheStatus();
    expect(statusAfter.hasJwksCache).toBe(true);
    expect(statusAfter.isCreatingJwks).toBe(false);
  });

  test("Discovery エラー時は次回再試行する", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(createMockConfiguration());

    await expect(getKeycloakServerMetadata()).rejects.toThrow("Network error");

    const statusAfterError = getKeycloakCacheStatus();
    expect(statusAfterError.hasMetadataCache).toBe(false);
    expect(statusAfterError.isDiscovering).toBe(false);

    const result = await getKeycloakServerMetadata();
    expect(result).toStrictEqual(mockServerMetadata);
    expect(mocks.discovery).toHaveBeenCalledTimes(2);

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
    vi.stubEnv("KEYCLOAK_ISSUER", "http://localhost:8080/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    await getKeycloakServerMetadata();

    expect(mocks.discovery).toHaveBeenCalledWith(
      new URL("http://localhost:8080/realms/test"),
      "__metadata_only__",
      undefined,
      undefined,
      { execute: [mocks.allowInsecureRequests] },
    );
  });
});

describe("createKeycloakConfiguration", () => {
  test("localhost URLの場合はallowInsecureRequestsが呼ばれる", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "http://localhost:8080/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    const mockConfigInstance = {};
    mocks.Configuration.mockReturnValueOnce(mockConfigInstance);

    const result = await createKeycloakConfiguration("test-client", "secret");

    expect(result).toBe(mockConfigInstance);
    expect(mocks.allowInsecureRequests).toHaveBeenCalledWith(
      mockConfigInstance,
    );
  });

  test("HTTPS URLの場合はallowInsecureRequestsが呼ばれない", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    const mockConfigInstance = {};
    mocks.Configuration.mockReturnValueOnce(mockConfigInstance);

    await createKeycloakConfiguration("test-client", "secret");

    expect(mocks.allowInsecureRequests).not.toHaveBeenCalled();
  });

  test("KEYCLOAK_ISSUERが未設定の場合はallowInsecureRequestsが呼ばれない", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");
    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());
    await getKeycloakServerMetadata();

    vi.stubEnv("KEYCLOAK_ISSUER", "");

    const mockConfigInstance = {};
    mocks.Configuration.mockReturnValueOnce(mockConfigInstance);

    await createKeycloakConfiguration("test-client", "secret");

    expect(mocks.allowInsecureRequests).not.toHaveBeenCalled();
  });

  test("clientSecretなしの場合はNone()が使用される（Public Client）", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "https://keycloak.example.com/realms/test");

    mocks.discovery.mockResolvedValueOnce(createMockConfiguration());

    const mockConfigInstance = {};
    mocks.Configuration.mockReturnValueOnce(mockConfigInstance);

    await createKeycloakConfiguration("public-client");

    expect(mocks.Configuration).toHaveBeenCalledWith(
      mockServerMetadata,
      "public-client",
      undefined,
      "none",
    );
  });
});
