import { google } from "googleapis";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { GoogleAuth } from "../../api/auth/index.js";
import type { AuthConfig, ServiceAccountCredentials } from "../../api/types.js";
import { createAuthClient, getApiKeyAuth } from "../../api/auth/index.js";
import { AuthenticationError } from "../../lib/errors/index.js";

// Googleライブラリのモック
vi.mock("googleapis");

describe("createAuthClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("service-account認証", () => {
    test("正常系: サービスアカウント認証クライアントを作成する", async () => {
      const mockAuth = { type: "service-account" };
      const mockFromJSON = vi.fn().mockReturnValue(mockAuth);
      vi.mocked(google.auth).fromJSON = mockFromJSON;

      const credentials: ServiceAccountCredentials = {
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key-id",
        private_key:
          "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com",
      };

      const config: AuthConfig = {
        type: "service-account",
        credentials,
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual(mockAuth);
      }
      expect(mockFromJSON).toHaveBeenCalledWith(credentials);
    });

    test("異常系: サービスアカウント認証でエラーが発生する", async () => {
      const mockFromJSON = vi.fn().mockImplementation(() => {
        throw new Error("Invalid credentials");
      });
      vi.mocked(google.auth).fromJSON = mockFromJSON;

      const credentials: ServiceAccountCredentials = {
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key-id",
        private_key: "invalid-key",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com",
      };

      const config: AuthConfig = {
        type: "service-account",
        credentials,
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain("Failed to create auth client");
        expect(result.error.message).toContain("Invalid credentials");
      }
    });
  });

  describe("oauth2認証", () => {
    test("正常系: OAuth2認証クライアントを作成する", async () => {
      const mockOAuth2Client = {
        setCredentials: vi.fn(),
      };
      const mockOAuth2Constructor = vi.fn().mockReturnValue(mockOAuth2Client);
      vi.mocked(google.auth).OAuth2 = mockOAuth2Constructor;

      const config: AuthConfig = {
        type: "oauth2",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        refreshToken: "test-refresh-token",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual(mockOAuth2Client);
      }
      expect(mockOAuth2Constructor).toHaveBeenCalledWith(
        "test-client-id",
        "test-client-secret",
        "urn:ietf:wg:oauth:2.0:oob",
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: "test-refresh-token",
      });
    });

    test("異常系: OAuth2認証でエラーが発生する", async () => {
      const mockOAuth2Constructor = vi.fn().mockImplementation(() => {
        throw new Error("OAuth2 initialization failed");
      });
      vi.mocked(google.auth).OAuth2 = mockOAuth2Constructor;

      const config: AuthConfig = {
        type: "oauth2",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        refreshToken: "test-refresh-token",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain("Failed to create auth client");
        expect(result.error.message).toContain("OAuth2 initialization failed");
      }
    });

    test("境界値: 空文字のOAuth2パラメータ", async () => {
      const mockOAuth2Client = {
        setCredentials: vi.fn(),
      };
      const mockOAuth2Constructor = vi.fn().mockReturnValue(mockOAuth2Client);
      vi.mocked(google.auth).OAuth2 = mockOAuth2Constructor;

      const config: AuthConfig = {
        type: "oauth2",
        clientId: "",
        clientSecret: "",
        refreshToken: "",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(true);
      expect(mockOAuth2Constructor).toHaveBeenCalledWith(
        "",
        "",
        "urn:ietf:wg:oauth:2.0:oob",
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: "",
      });
    });
  });

  describe("api-key認証", () => {
    test("正常系: API Key認証でエラーを返す", async () => {
      const config: AuthConfig = {
        type: "api-key",
        apiKey: "test-api-key",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toStrictEqual(
          "API Key authentication is not supported for write operations",
        );
      }
    });

    test("境界値: 空のAPI Key", async () => {
      const config: AuthConfig = {
        type: "api-key",
        apiKey: "",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toStrictEqual(
          "API Key authentication is not supported for write operations",
        );
      }
    });
  });

  describe("adc認証", () => {
    test("正常系: Application Default Credentials認証クライアントを作成する", async () => {
      const mockClient = { type: "adc-client" };
      const mockGoogleAuth = {
        getClient: vi.fn().mockResolvedValue(mockClient),
      };
      const mockGoogleAuthConstructor = vi.fn().mockReturnValue(mockGoogleAuth);
      vi.mocked(google.auth).GoogleAuth = mockGoogleAuthConstructor;

      const config: AuthConfig = {
        type: "adc",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual(mockClient);
      }
      expect(mockGoogleAuthConstructor).toHaveBeenCalledWith({
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive",
        ],
      });
      expect(mockGoogleAuth.getClient).toHaveBeenCalled();
    });

    test("異常系: ADC認証でgetClientがエラーを発生させる", async () => {
      const mockGoogleAuth = {
        getClient: vi.fn().mockRejectedValue(new Error("ADC not found")),
      };
      const mockGoogleAuthConstructor = vi.fn().mockReturnValue(mockGoogleAuth);
      vi.mocked(google.auth).GoogleAuth = mockGoogleAuthConstructor;

      const config: AuthConfig = {
        type: "adc",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain(
          "Failed to get Application Default Credentials",
        );
        expect(result.error.message).toContain("ADC not found");
      }
    });

    test("異常系: ADC認証でコンストラクタがエラーを発生させる", async () => {
      const mockGoogleAuthConstructor = vi.fn().mockImplementation(() => {
        throw new Error("GoogleAuth constructor failed");
      });
      vi.mocked(google.auth).GoogleAuth = mockGoogleAuthConstructor;

      const config: AuthConfig = {
        type: "adc",
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain(
          "Failed to get Application Default Credentials",
        );
        expect(result.error.message).toContain("GoogleAuth constructor failed");
      }
    });
  });

  describe("unknown認証タイプ", () => {
    test("異常系: 不明な認証タイプでエラーを返す", async () => {
      // TypeScriptの型チェックを回避するため、意図的に不正な型をキャスト
      const config = {
        type: "unknown",
      } as AuthConfig;

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toStrictEqual(
          "Unknown authentication type",
        );
      }
    });
  });

  describe("一般的な例外処理", () => {
    test("異常系: 文字列エラーが発生した場合", async () => {
      const mockFromJSON = vi.fn().mockImplementation(() => {
        throw "String error";
      });
      vi.mocked(google.auth).fromJSON = mockFromJSON;

      const credentials: ServiceAccountCredentials = {
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key-id",
        private_key: "test-key",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com",
      };

      const config: AuthConfig = {
        type: "service-account",
        credentials,
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain("Failed to create auth client");
        expect(result.error.message).toContain("String error");
      }
    });

    test("異常系: nullエラーが発生した場合", async () => {
      const mockFromJSON = vi.fn().mockImplementation(() => {
        throw null;
      });
      vi.mocked(google.auth).fromJSON = mockFromJSON;

      const credentials: ServiceAccountCredentials = {
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key-id",
        private_key: "test-key",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com",
      };

      const config: AuthConfig = {
        type: "service-account",
        credentials,
      };

      const result = await createAuthClient(config);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain("Failed to create auth client");
        expect(result.error.message).toContain("null");
      }
    });
  });
});

describe("getApiKeyAuth", () => {
  test("正常系: 有効なAPI Keyを返す", () => {
    const apiKey = "AIzaSyTest_API_Key_123";
    const result = getApiKeyAuth(apiKey);

    expect(result).toStrictEqual(apiKey);
  });

  test("正常系: 前後に空白があるAPI Keyを正常に処理する", () => {
    const apiKey = "  AIzaSyTest_API_Key_123  ";
    const result = getApiKeyAuth(apiKey);

    expect(result).toStrictEqual(apiKey);
  });

  test("異常系: 空文字のAPI Keyでエラーを発生させる", () => {
    expect(() => getApiKeyAuth("")).toThrow(AuthenticationError);
    expect(() => getApiKeyAuth("")).toThrow("API Key is required");
  });

  test("異常系: 空白のみのAPI Keyでエラーを発生させる", () => {
    expect(() => getApiKeyAuth("   ")).toThrow(AuthenticationError);
    expect(() => getApiKeyAuth("   ")).toThrow("API Key is required");
  });

  test("異常系: タブ文字のみのAPI Keyでエラーを発生させる", () => {
    expect(() => getApiKeyAuth("\t\t")).toThrow(AuthenticationError);
    expect(() => getApiKeyAuth("\t\t")).toThrow("API Key is required");
  });

  test("異常系: 改行文字のみのAPI Keyでエラーを発生させる", () => {
    expect(() => getApiKeyAuth("\n\r")).toThrow(AuthenticationError);
    expect(() => getApiKeyAuth("\n\r")).toThrow("API Key is required");
  });

  test("境界値: 1文字のAPI Key", () => {
    const apiKey = "A";
    const result = getApiKeyAuth(apiKey);

    expect(result).toStrictEqual(apiKey);
  });

  test("境界値: 非常に長いAPI Key", () => {
    const apiKey = "A".repeat(1000);
    const result = getApiKeyAuth(apiKey);

    expect(result).toStrictEqual(apiKey);
  });

  test("境界値: 特殊文字を含むAPI Key", () => {
    const apiKey = "AIza!@#$%^&*()_+-={}[]|\\:;\"'<>?,./ ";
    const result = getApiKeyAuth(apiKey);

    expect(result).toStrictEqual(apiKey);
  });

  test("境界値: Unicode文字を含むAPI Key", () => {
    const apiKey = "AIza日本語テストΨΩΦ🚀";
    const result = getApiKeyAuth(apiKey);

    expect(result).toStrictEqual(apiKey);
  });
});
