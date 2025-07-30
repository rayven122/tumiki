import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { OAuthProvider } from "./providers/index.js";
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
  const mockGetUser =
    vi.fn<(params: GetUserParams) => Promise<{ data: UserData }>>();

  return {
    auth0OAuth: {
      getSession: mockGetSession,
    },
    managementClient: {
      users: {
        get: mockGetUser,
      },
    },
  };
});

// モック関数を取得

const getAuth0OAuth = () => vi.mocked(auth0OAuth);

const getManagementClient = () => vi.mocked(managementClient);

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
    expect(url).toContain("prompt=consent");
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

    getManagementClient().users.get.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual("gho_testtoken123");
    expect(getManagementClient().users.get).toHaveBeenCalledWith({
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

    getManagementClient().users.get.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("identitiesが空の場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    getManagementClient().users.get.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("identitiesがundefinedの場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {},
    };

    getManagementClient().users.get.mockResolvedValue(mockUser);

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

    getManagementClient().users.get.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("ManagementClient APIエラー時はOAuthErrorをスローする", async () => {
    const apiError = new Error("API Error");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockRejectedValue(apiError);

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

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockResolvedValue(mockUser);

    const token = await getProviderAccessToken("github");

    expect(token).toStrictEqual("gho_testtoken123");
  });

  test("NextRequestオブジェクトが渡された場合、それを使用してセッションを取得する", async () => {
    const mockRequest = {} as NextRequest;
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
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

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockResolvedValue(mockUser);

    const token = await getProviderAccessToken("github", mockRequest);

    expect(getAuth0OAuth().getSession).toHaveBeenCalledWith(mockRequest);
    expect(token).toStrictEqual("gho_testtoken123");
  });

  test("セッションが存在しない場合、UNAUTHORIZEDエラーをスローする", async () => {
    getAuth0OAuth().getSession.mockResolvedValue(null);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNAUTHORIZED,
      provider: "github",
    });
  });

  test("セッションのuserがnullの場合、UNAUTHORIZEDエラーをスローする", async () => {
    // @ts-expect-error: テスト用の意図的な不完全なセッション
    const mockSession = { user: null };
    getAuth0OAuth().getSession.mockResolvedValue(mockSession);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNAUTHORIZED,
      provider: "github",
    });
  });

  test("セッションのuser.subがundefinedの場合、UNAUTHORIZEDエラーをスローする", async () => {
    // @ts-expect-error: テスト用の意図的な不完全なセッション
    const mockSession = { user: {} };
    getAuth0OAuth().getSession.mockResolvedValue(mockSession);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNAUTHORIZED,
      provider: "github",
    });
  });

  test("トークンが見つからない場合、NO_ACCESS_TOKENエラーをスローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockResolvedValue(mockUser);

    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.NO_ACCESS_TOKEN,
      provider: "github",
    });
  });

  test("getUserIdentityProviderTokensのエラーはそのまま伝播する", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
    };

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockRejectedValue(
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
    };
    const oauthError = new OAuthError(
      "Test error",
      OAuthErrorCode.CONNECTION_FAILED,
      "github",
    );

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockRejectedValue(oauthError);

    // エラーインスタンスのチェック
    await expect(getProviderAccessToken("github")).rejects.toThrow(OAuthError);
    await expect(getProviderAccessToken("github")).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });

  test("予期しないエラーの場合、UNKNOWN_ERRORをスローする", async () => {
    // getSessionがError以外の値をスローする場合

    getAuth0OAuth().getSession.mockRejectedValue("Unexpected non-error value");

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

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockResolvedValue(mockUser);

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(true);
  });

  test("トークンが存在しない場合はfalseを返す", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
    };
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockResolvedValue(mockUser);

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(false);
  });

  test("未認証の場合はfalseを返す", async () => {
    getAuth0OAuth().getSession.mockResolvedValue(null);

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(false);
  });

  test("NextRequestが渡された場合はそれを使用する", async () => {
    const mockRequest = {} as NextRequest;
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
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

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockResolvedValue(mockUser);

    const isConnected = await checkOAuthConnection("github", mockRequest);

    expect(getAuth0OAuth().getSession).toHaveBeenCalledWith(mockRequest);
    expect(isConnected).toStrictEqual(true);
  });

  test("CONNECTION_FAILEDエラーが発生した場合はエラーを再スローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
    };

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockRejectedValue(
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
    };
    const oauthError = new OAuthError(
      "Unknown error",
      OAuthErrorCode.UNKNOWN_ERROR,
      "github",
    );

    getAuth0OAuth().getSession.mockResolvedValue(mockSession);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    getManagementClient().users.get.mockRejectedValue(oauthError);

    // エラーインスタンスのチェック
    await expect(checkOAuthConnection("github")).rejects.toThrow(OAuthError);
    await expect(checkOAuthConnection("github")).rejects.toMatchObject({
      code: OAuthErrorCode.CONNECTION_FAILED,
      provider: "github",
    });
  });

  test("OAuthError以外のエラーが発生した場合もエラーを再スローする", async () => {
    // getSessionが文字列をスローする場合

    getAuth0OAuth().getSession.mockRejectedValue("Unexpected string error");

    await expect(checkOAuthConnection("github")).rejects.toThrow(OAuthError);
    await expect(checkOAuthConnection("github")).rejects.toMatchObject({
      code: OAuthErrorCode.UNKNOWN_ERROR,
      provider: "github",
    });
  });
});
