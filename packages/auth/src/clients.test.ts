import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { ManagementClient } from "auth0";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Auth0クライアントのモック
vi.mock("@auth0/nextjs-auth0/server", () => ({
  Auth0Client: vi.fn(),
}));

// ManagementClientのモック
vi.mock("auth0", () => ({
  ManagementClient: vi.fn(),
}));

describe("clients", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("auth0クライアントが正しい設定で作成される", async () => {
    // 環境変数を設定
    process.env.AUTH0_DOMAIN = "test.auth0.com";
    process.env.AUTH0_CLIENT_ID = "test-client-id";
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.AUTH0_SECRET = "test-secret";

    // モジュールをインポート（環境変数設定後）
    const { auth0 } = await import("./clients");

    // Auth0Clientが正しい引数で呼ばれたことを確認
    expect(Auth0Client).toHaveBeenCalledWith({
      domain: "test.auth0.com",
      clientId: "test-client-id",
      appBaseUrl: "http://localhost:3000",
      secret: "test-secret",
    });

    // インスタンスが作成されていることを確認
    expect(auth0).toBeDefined();
  });

  test("auth0OAuthクライアントが正しい設定で作成される", async () => {
    // 環境変数を設定
    process.env.AUTH0_DOMAIN = "test.auth0.com";
    process.env.AUTH0_OAUTH_CLIENT_ID = "oauth-client-id";
    process.env.AUTH0_OAUTH_CLIENT_SECRET = "oauth-client-secret";
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.AUTH0_SECRET = "test-secret";

    // モジュールをインポート（環境変数設定後）
    const { auth0OAuth } = await import("./clients");

    // Auth0Clientが正しい引数で呼ばれたことを確認
    expect(Auth0Client).toHaveBeenCalledWith({
      domain: "test.auth0.com",
      clientId: "oauth-client-id",
      clientSecret: "oauth-client-secret",
      appBaseUrl: "http://localhost:3000",
      secret: "test-secret",
      session: {
        cookie: {
          name: "__oauthSession",
        },
      },
      routes: {
        login: "/oauth/auth/login",
        callback: "/oauth/auth/callback",
        logout: "/oauth/auth/logout",
      },
    });

    // インスタンスが作成されていることを確認
    expect(auth0OAuth).toBeDefined();
  });

  test("managementClientが正しい設定で作成される", async () => {
    // 環境変数を設定
    process.env.AUTH0_DOMAIN = "test.auth0.com";
    process.env.AUTH0_M2M_CLIENT_ID = "m2m-client-id";
    process.env.AUTH0_M2M_CLIENT_SECRET = "m2m-client-secret";

    // モジュールをインポート（環境変数設定後）
    const { managementClient } = await import("./clients");

    // ManagementClientが正しい引数で呼ばれたことを確認
    expect(ManagementClient).toHaveBeenCalledWith({
      domain: "test.auth0.com",
      clientId: "m2m-client-id",
      clientSecret: "m2m-client-secret",
    });

    // インスタンスが作成されていることを確認
    expect(managementClient).toBeDefined();
  });

  test("auth0OAuthクライアントがundefinedの環境変数でも作成される", async () => {
    // 環境変数を設定（OAuthのclientIdとclientSecretを設定しない）
    process.env.AUTH0_DOMAIN = "test.auth0.com";
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.AUTH0_SECRET = "test-secret";
    delete process.env.AUTH0_OAUTH_CLIENT_ID;
    delete process.env.AUTH0_OAUTH_CLIENT_SECRET;

    // モジュールをインポート（環境変数設定後）
    const { auth0OAuth } = await import("./clients");

    // Auth0Clientが正しい引数で呼ばれたことを確認
    expect(Auth0Client).toHaveBeenCalledWith({
      domain: "test.auth0.com",
      clientId: undefined,
      clientSecret: undefined,
      appBaseUrl: "http://localhost:3000",
      secret: "test-secret",
      session: {
        cookie: {
          name: "__oauthSession",
        },
      },
      routes: {
        login: "/oauth/auth/login",
        callback: "/oauth/auth/callback",
        logout: "/oauth/auth/logout",
      },
    });

    // インスタンスが作成されていることを確認
    expect(auth0OAuth).toBeDefined();
  });

  test("すべてのクライアントが正しくエクスポートされている", async () => {
    // 環境変数を設定
    process.env.AUTH0_DOMAIN = "test.auth0.com";
    process.env.AUTH0_CLIENT_ID = "test-client-id";
    process.env.AUTH0_OAUTH_CLIENT_ID = "oauth-client-id";
    process.env.AUTH0_OAUTH_CLIENT_SECRET = "oauth-client-secret";
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.AUTH0_SECRET = "test-secret";
    process.env.AUTH0_M2M_CLIENT_ID = "m2m-client-id";
    process.env.AUTH0_M2M_CLIENT_SECRET = "m2m-client-secret";

    // モジュールをインポート
    const clients = await import("./clients");

    // すべてのクライアントがエクスポートされていることを確認
    expect(clients).toHaveProperty("auth0");
    expect(clients).toHaveProperty("auth0OAuth");
    expect(clients).toHaveProperty("managementClient");
  });
});
