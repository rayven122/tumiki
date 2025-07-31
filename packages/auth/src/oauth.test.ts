/* eslint-disable @typescript-eslint/unbound-method */
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { OAuthProvider } from "./providers.js";
// モック関数のimport
import { auth0OAuth, managementClient } from "./clients.js";
import { OAuthError, OAuthErrorCode } from "./errors.js";
import {
  checkOAuthConnection,
  getProviderAccessToken,
  getUserIdentityProviderTokens,
  startOAuthFlow,
} from "./oauth.js";

// 型定義
type Identity = {
  connection: string;
  access_token?: string;
};

type UserData = {
  identities?: Identity[];
};

type MockSession = {
  user: {
    sub: string;
  };
  tokenSet: {
    accessToken: string;
    expiresAt: number;
  };
  internal: {
    sid: string;
    createdAt: number;
  };
};

type GetUserParams = {
  id: string;
  fields?: string;
  include_fields?: boolean;
};

// モックの設定
vi.mock("./clients.js", () => {
  const mockGetSession =
    vi.fn<(req?: NextRequest) => Promise<MockSession | null>>();

  // users.getのモック関数 - 直接実行される関数として実装
  const mockUsersGet =
    vi.fn<(params: GetUserParams) => Promise<{ data: UserData }>>();

  return {
    auth0OAuth: {
      getSession: mockGetSession,
    },
    managementClient: {
      users: {
        get: mockUsersGet,
      },
    },
  };
});

describe("startOAuthFlow", () => {
  test("指定されたプロバイダーとスコープでOAuth認証URLを生成する", async () => {
    const config = {
      provider: "github" as OAuthProvider,
      scopes: ["read:user", "repo"],
    };
    const returnTo = "/dashboard";

    const url = await startOAuthFlow(config, returnTo);

    expect(url).toContain("/oauth/auth/login?");
    expect(url).toContain("returnTo=%2Fdashboard");
    expect(url).toContain("connection=github");
    expect(url).toContain("scope=openid+profile+email+read%3Auser+repo");
  });

  test("returnToが指定されない場合はデフォルトの/mcpを使用する", async () => {
    const config = {
      provider: "google" as OAuthProvider,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    };

    const url = await startOAuthFlow(config);

    expect(url).toContain("returnTo=%2Fmcp");
    expect(url).toContain("connection=google-oauth2");
  });

  test("スコープが空の場合でも基本スコープを含める", async () => {
    const config = {
      provider: "github" as OAuthProvider,
      scopes: [],
    };

    const url = await startOAuthFlow(config);

    expect(url).toContain("scope=openid+profile+email");
    expect(url).toContain("prompt=consent");
  });
});

describe("getUserIdentityProviderTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ユーザーのプロバイダートークンを正常に取得する", async () => {
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "github",
            access_token: "gho_testtoken123",
          },
          {
            connection: "google-oauth2",
            access_token: "ya29.testtoken456",
          },
        ],
      },
    };

    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual("gho_testtoken123");
    expect(managementClient.users.get).toHaveBeenCalledWith({
      id: "auth0|123",
      fields: "identities",
      include_fields: true,
    });
  });

  test("プロバイダーのidentityが見つからない場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "google-oauth2",
            access_token: "ya29.testtoken456",
          },
        ],
      },
    };

    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("identitiesが空の場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("identitiesがundefinedの場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {},
    };

    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("access_tokenが存在しない場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "github",
            // access_tokenなし
          },
        ],
      },
    };

    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("ManagementClient APIエラー時はOAuthErrorをスローする", async () => {
    const apiError = new Error("API Error");
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      apiError,
    );

    await expect(
      getUserIdentityProviderTokens("auth0|123", "github"),
    ).rejects.toThrow(OAuthError);

    await expect(
      getUserIdentityProviderTokens("auth0|123", "github"),
    ).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });
});

describe("getProviderAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("セッションとトークンが存在する場合、アクセストークンを返す", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "github",
            access_token: "gho_testtoken123",
          },
        ],
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getProviderAccessToken("github");

    expect(token).toStrictEqual("gho_testtoken123");
  });

  test("NextRequestオブジェクトが渡された場合、それを使用してセッションを取得する", async () => {
    const mockRequest = {} as NextRequest;
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "github",
            access_token: "gho_testtoken123",
          },
        ],
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const token = await getProviderAccessToken("github", mockRequest);

    expect(vi.mocked(auth0OAuth).getSession).toHaveBeenCalledWith(mockRequest);
    expect(token).toStrictEqual("gho_testtoken123");
  });

  test("セッションが存在しない場合、UNAUTHORIZEDエラーをスローする", async () => {
    vi.mocked(auth0OAuth).getSession.mockResolvedValue(null);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNAUTHORIZED,
      provider: "github",
    });
  });

  test("セッションのuserがnullの場合、UNAUTHORIZEDエラーをスローする", async () => {
    const mockSession = {
      user: null,
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    } as unknown as MockSession;
    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNAUTHORIZED,
      provider: "github",
    });
  });

  test("セッションのuser.subがundefinedの場合、UNAUTHORIZEDエラーをスローする", async () => {
    const mockSession = {
      user: {} as { sub: string },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    } as unknown as MockSession;
    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNAUTHORIZED,
      provider: "github",
    });
  });

  test("トークンが見つからない場合、NO_ACCESS_TOKENエラーをスローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.NO_ACCESS_TOKEN,
      provider: "github",
    });
  });

  test("getUserIdentityProviderTokensのエラーはそのまま伝播する", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unexpected error"),
    );

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });

  test("OAuthErrorが既にスローされた場合はそのまま再スローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const oauthError = new OAuthError(
      "Test error",
      OAuthErrorCode.CONNECTION_FAILED,
      "github",
    );

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      oauthError,
    );

    // エラーインスタンスのチェック
    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });

  test("予期しないエラーの場合、UNKNOWN_ERRORをスローする", async () => {
    // getSessionがError以外の値をスローする場合

    vi.mocked(auth0OAuth).getSession.mockRejectedValue(
      "Unexpected non-error value",
    );

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNKNOWN_ERROR,
      provider: "github",
    });
  });
});

describe("checkOAuthConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("トークンが存在する場合はtrueを返す", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "github",
            access_token: "gho_testtoken123",
          },
        ],
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(true);
  });

  test("トークンが存在しない場合はfalseを返す", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(false);
  });

  test("未認証の場合はfalseを返す", async () => {
    vi.mocked(auth0OAuth).getSession.mockResolvedValue(null);

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(false);
  });

  test("NextRequestが渡された場合はそれを使用する", async () => {
    const mockRequest = {} as NextRequest;
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [
          {
            connection: "github",
            access_token: "gho_testtoken123",
          },
        ],
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser,
    );

    const isConnected = await checkOAuthConnection("github", mockRequest);

    expect(vi.mocked(auth0OAuth).getSession).toHaveBeenCalledWith(mockRequest);
    expect(isConnected).toStrictEqual(true);
  });

  test("CONNECTION_FAILEDエラーが発生した場合はエラーを再スローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection failed"),
    );

    await expect(checkOAuthConnection("github")).rejects.toThrow(OAuthError);
    await expect(checkOAuthConnection("github")).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });

  test("その他のOAuthErrorが発生した場合はエラーを再スローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
      tokenSet: {
        accessToken: "test_access_token",
        expiresAt: Date.now() + 3600000,
      },
      internal: {
        sid: "test_session_id",
        createdAt: Date.now(),
      },
    };
    const oauthError = new OAuthError(
      "Unknown error",
      OAuthErrorCode.UNKNOWN_ERROR,
      "github",
    );

    vi.mocked(auth0OAuth).getSession.mockResolvedValue(mockSession);
    (managementClient.users.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      oauthError,
    );

    // エラーインスタンスのチェック
    await expect(checkOAuthConnection("github")).rejects.toThrow(OAuthError);
    await expect(checkOAuthConnection("github")).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });

  test("OAuthError以外のエラーが発生した場合もエラーを再スローする", async () => {
    // getSessionが文字列をスローする場合

    vi.mocked(auth0OAuth).getSession.mockRejectedValue(
      "Unexpected string error",
    );

    await expect(checkOAuthConnection("github")).rejects.toThrow(OAuthError);
    await expect(checkOAuthConnection("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNKNOWN_ERROR,
      provider: "github",
    });
  });
});
