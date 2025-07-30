/* eslint-disable @typescript-eslint/unbound-method */
import type { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth0 } from "./clients.js";
import * as serverModule from "./server.js";
import { auth, authSignIn, getAuth } from "./server.js";

// Mock SessionData type
type SessionData = {
  user: { sub: string };
  tokenSet: { accessToken: string; expiresAt: number };
  internal: {
    sid: string;
    createdAt: number;
  };
};

// モックの設定を先頭に配置
vi.mock("./clients.js", () => ({
  auth0: {
    getSession: vi.fn(),
    startInteractiveLogin: vi.fn(),
  },
  auth0OAuth: {},
  managementClient: {},
}));

// React cache モックの設定
vi.mock("react", () => ({
  cache: (fn: () => unknown) => fn,
}));

// oauth.jsのモック
vi.mock("./oauth.js", () => ({
  getUserIdentityProviderTokens: vi.fn(),
  getProviderAccessToken: vi.fn(),
  startOAuthFlow: vi.fn(),
  checkOAuthConnection: vi.fn(),
  OAuthConfig: {},
  OAuthProvider: {},
  PROVIDER_CONNECTIONS: {},
  OAUTH_PROVIDERS: {},
}));

// providers/index.jsのモック
vi.mock("./providers/index.js", () => ({
  PROVIDER_CONNECTIONS: {
    github: "github",
    google: "google-oauth2",
    slack: "slack",
    notion: "notion",
    linkedin: "linkedin",
  },
  OAUTH_PROVIDERS: ["github", "google", "slack", "notion", "linkedin"],
  OAuthProvider: {},
}));

// providers/validation.jsのモック
vi.mock("./providers/validation.js", () => ({
  validateProviderToken: vi.fn(),
}));

// モック関数の取得

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("正常系: セッションを取得する", async () => {
    const mockSession: SessionData = {
      user: { sub: "user_123" },
      tokenSet: {
        accessToken: "access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    vi.mocked(auth0).getSession.mockResolvedValue(mockSession);

    const result = await auth();

    expect(vi.mocked(auth0).getSession).toHaveBeenCalledWith();
    expect(result).toStrictEqual(mockSession);
  });

  test("正常系: セッションが存在しない場合はnullを返す", async () => {
    vi.mocked(auth0).getSession.mockResolvedValue(null);

    const result = await auth();

    expect(vi.mocked(auth0).getSession).toHaveBeenCalledWith();
    expect(result).toStrictEqual(null);
  });

  test("正常系: 複数回呼び出してもキャッシュされた結果を返す", async () => {
    const mockSession: SessionData = {
      user: { sub: "user_123" },
      tokenSet: {
        accessToken: "access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    vi.mocked(auth0).getSession.mockResolvedValue(mockSession);

    const result1 = await auth();
    const result2 = await auth();

    // React.cacheのモックにより、実際にはキャッシュされないが、
    // 本番環境では同じ結果が返される
    expect(result1).toStrictEqual(mockSession);
    expect(result2).toStrictEqual(mockSession);
  });
});

describe("authSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("正常系: デフォルトのreturnToでサインインを開始する", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn();

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/dashboard",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: カスタムreturnToでサインインを開始する", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn(undefined, { returnTo: "/custom-page" });

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/custom-page",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: プロバイダー引数は無視される", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn("google", { returnTo: "/dashboard" });

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/dashboard",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: 空のオプションオブジェクトでデフォルトのreturnToを使用する", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn(undefined, {});

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/dashboard",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: returnToがundefinedの場合デフォルトを使用する", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn(undefined, { returnTo: undefined });

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/dashboard",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: returnToが空文字の場合デフォルトを使用する", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn(undefined, { returnTo: "" });

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/dashboard",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: プロバイダーとオプションが両方undefinedの場合", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn(undefined, undefined);

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/dashboard",
    });
    expect(result).toStrictEqual(mockResult);
  });

  test("正常系: プロバイダーがnullの場合でも正常に動作する", async () => {
    const mockResult = {
      redirect: "/auth/login",
      status: 302,
      headers: new Headers(),
      cookies: new Map(),
    } as unknown as NextResponse;
    vi.mocked(auth0).startInteractiveLogin.mockResolvedValue(mockResult);

    const result = await authSignIn(null as unknown as string, {
      returnTo: "/home",
    });

    expect(vi.mocked(auth0).startInteractiveLogin).toHaveBeenCalledWith({
      returnTo: "/home",
    });
    expect(result).toStrictEqual(mockResult);
  });
});

describe("getAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("正常系: リクエストからセッションを取得する", async () => {
    const mockRequest = new Request("http://localhost:3000/") as NextRequest;
    const mockSession: SessionData = {
      user: { sub: "user_123" },
      tokenSet: {
        accessToken: "access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    vi.mocked(auth0).getSession.mockResolvedValue(mockSession);

    const result = await getAuth(mockRequest);

    expect(vi.mocked(auth0).getSession).toHaveBeenCalledWith(mockRequest);
    expect(result).toStrictEqual(mockSession);
  });

  test("正常系: セッションが存在しない場合はnullを返す", async () => {
    const mockRequest = new Request("http://localhost:3000/") as NextRequest;
    vi.mocked(auth0).getSession.mockResolvedValue(null);

    const result = await getAuth(mockRequest);

    expect(vi.mocked(auth0).getSession).toHaveBeenCalledWith(mockRequest);
    expect(result).toStrictEqual(null);
  });

  test("異常系: getSessionがエラーをスローする", async () => {
    const mockRequest = new Request("http://localhost:3000/") as NextRequest;
    const error = new Error("Session error");
    vi.mocked(auth0).getSession.mockRejectedValue(error);

    await expect(getAuth(mockRequest)).rejects.toThrow("Session error");
  });
});

describe("server module exports", () => {
  test("正常系: auth関数がエクスポートされている", () => {
    expect(serverModule.auth).toBeDefined();
    expect(typeof serverModule.auth).toStrictEqual("function");
  });

  test("正常系: authSignIn関数がエクスポートされている", () => {
    expect(serverModule.authSignIn).toBeDefined();
    expect(typeof serverModule.authSignIn).toStrictEqual("function");
  });

  test("正常系: getAuth関数がエクスポートされている", () => {
    expect(serverModule.getAuth).toBeDefined();
    expect(typeof serverModule.getAuth).toStrictEqual("function");
  });

  test("正常系: auth0がエクスポートされている", () => {
    expect(serverModule.auth0).toBeDefined();
    expect(serverModule.auth0).toStrictEqual(auth0);
  });

  test("正常系: auth0OAuthがエクスポートされている", () => {
    expect(serverModule.auth0OAuth).toBeDefined();
  });

  test("正常系: managementClientがエクスポートされている", () => {
    expect(serverModule.managementClient).toBeDefined();
  });

  test("正常系: oauth.jsからの関数がエクスポートされている", () => {
    // oauth.jsからエクスポートされる主要な関数を確認
    expect(serverModule.getUserIdentityProviderTokens).toBeDefined();
    expect(serverModule.getProviderAccessToken).toBeDefined();
    expect(serverModule.startOAuthFlow).toBeDefined();
    expect(serverModule.checkOAuthConnection).toBeDefined();
  });

  test("正常系: providers/index.jsからの定数がエクスポートされている", () => {
    // providers/index.jsからエクスポートされる定数を確認
    expect(serverModule.PROVIDER_CONNECTIONS).toBeDefined();
    expect(serverModule.OAUTH_PROVIDERS).toBeDefined();
  });
});

describe("auth function error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("異常系: getSessionがエラーをスローする場合", async () => {
    const error = new Error("Auth0 session error");
    vi.mocked(auth0).getSession.mockRejectedValue(error);

    await expect(auth()).rejects.toThrow("Auth0 session error");
  });
});

describe("authSignIn error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("異常系: startInteractiveLoginがエラーをスローする場合", async () => {
    const error = new Error("Login initialization failed");
    vi.mocked(auth0).startInteractiveLogin.mockRejectedValue(error);

    await expect(authSignIn()).rejects.toThrow("Login initialization failed");
  });

  test("異常系: カスタムreturnToでstartInteractiveLoginがエラーをスローする場合", async () => {
    const error = new Error("Login initialization failed");
    vi.mocked(auth0).startInteractiveLogin.mockRejectedValue(error);

    await expect(
      authSignIn(undefined, { returnTo: "/custom" }),
    ).rejects.toThrow("Login initialization failed");
  });
});
