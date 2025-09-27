/* eslint-disable @typescript-eslint/no-empty-function */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getAuthConfig } from "../lib/auth-config.js";

describe("getAuthConfig - 環境変数処理", () => {
  beforeEach(() => {
    // 各テスト前に環境変数とモックをクリア
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    delete process.env.GOOGLE_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("有効なService Account JSONでservice-account設定を返す", () => {
    const validServiceAccount = {
      type: "service_account",
      project_id: "test-project",
      private_key_id: "key-id",
      private_key:
        "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n",
      client_email: "test@test-project.iam.gserviceaccount.com",
      client_id: "123456789",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    };

    process.env.GOOGLE_SERVICE_ACCOUNT_KEY =
      JSON.stringify(validServiceAccount);

    const result = getAuthConfig();

    expect(result).toStrictEqual({
      type: "service-account",
      credentials: validServiceAccount,
    });
  });

  test("無効なService Account JSONで例外が発生する", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "invalid json";

    // getAuthConfig関数が適切にエラーを投げることを確認
    expect(() => {
      getAuthConfig();
    }).toThrow("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:");
  });

  test("OAuth2認証情報でoauth2設定を返す", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "refresh-token";

    const result = getAuthConfig();

    expect(result).toStrictEqual({
      type: "oauth2",
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
    });
  });

  test("OAuth2認証情報が部分的に欠けている場合は無視される", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    // refreshTokenなし

    process.env.GOOGLE_API_KEY = "api-key";

    const result = getAuthConfig();

    // OAuth2ではなくAPI Keyが使用される
    expect(result).toStrictEqual({
      type: "api-key",
      apiKey: "api-key",
    });
  });

  test("API Keyでapi-key設定を返す", () => {
    process.env.GOOGLE_API_KEY = "test-api-key";

    const result = getAuthConfig();

    expect(result).toStrictEqual({
      type: "api-key",
      apiKey: "test-api-key",
    });
  });

  test("認証情報が何も設定されていない場合ADCにフォールバック", () => {
    // console.errorがテスト内で直接呼ばれるように実装
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = getAuthConfig();

    expect(result).toStrictEqual({
      type: "adc",
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "No explicit credentials provided, using Application Default Credentials",
    );

    consoleSpy.mockRestore();
  });

  test("Service Account設定が優先される", () => {
    const validServiceAccount = {
      type: "service_account",
      project_id: "test-project",
      private_key: "test-key",
      client_email: "test@test-project.iam.gserviceaccount.com",
    };

    process.env.GOOGLE_SERVICE_ACCOUNT_KEY =
      JSON.stringify(validServiceAccount);
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "refresh-token";
    process.env.GOOGLE_API_KEY = "api-key";

    const result = getAuthConfig();

    expect(result.type).toBe("service-account");
  });

  test("OAuth2がAPI Keyより優先される", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "refresh-token";
    process.env.GOOGLE_API_KEY = "api-key";

    const result = getAuthConfig();

    expect(result.type).toBe("oauth2");
  });

  test("JSON parse時の例外処理が正しく動作する", () => {
    // JSON.parse自体のエラーハンドリングが適切かを確認
    expect(() => {
      JSON.parse("invalid json");
    }).toThrow(/Unexpected token/);

    expect(() => {
      JSON.parse("");
    }).toThrow();
  });
});
