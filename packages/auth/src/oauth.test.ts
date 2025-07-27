import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { OAuthProvider } from "./providers/index.js";
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
const mockGetSession =
  mock<(req?: NextRequest) => Promise<MockSession | null>>();
const mockGetUser =
  mock<(params: GetUserParams) => Promise<{ data: UserData }>>();

void mock.module("./index.js", () => ({
  auth0: {
    getSession: mockGetSession,
  },
  managementClient: {
    users: {
      get: mockGetUser,
    },
  },
}));

describe("startOAuthFlow", () => {
  test("指定されたプロバイダーとスコープでOAuth認証URLを生成する", async () => {
    const config = {
      provider: "github" as OAuthProvider,
      scopes: ["read:user", "repo"],
    };
    const returnTo = "/dashboard";

    const url = await startOAuthFlow(config, returnTo);

    expect(url).toContain("/auth/login?");
    expect(url).toContain("returnTo=%2Fdashboard");
    expect(url).toContain("connection=github");
    expect(url).toContain("scope=openid+profile+email+read%3Auser+repo");
    expect(url).toContain("prompt=consent");
  });

  test("returnToが指定されない場合はデフォルトの/mcpを使用する", async () => {
    const config = {
      provider: "google-oauth2" as OAuthProvider,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    };

    const url = await startOAuthFlow(config);

    expect(url).toContain("returnTo=%2Fmcp");
  });

  test("スコープが空の場合でも基本スコープを含める", async () => {
    const config = {
      provider: "github" as OAuthProvider,
      scopes: [],
    };

    const url = await startOAuthFlow(config);

    expect(url).toContain("scope=openid+profile+email");
  });
});

describe("getUserIdentityProviderTokens", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
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

    mockGetUser.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual("gho_testtoken123");
    expect(mockGetUser).toHaveBeenCalledWith({
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

    mockGetUser.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("identitiesが空の場合はnullを返す", async () => {
    const mockUser: { data: UserData } = {
      data: {
        identities: [],
      },
    };

    mockGetUser.mockResolvedValue(mockUser);

    const token = await getUserIdentityProviderTokens("auth0|123", "github");

    expect(token).toStrictEqual(null);
  });

  test("ManagementClient APIエラー時はOAuthErrorをスローする", async () => {
    const apiError = new Error("API Error");
    mockGetUser.mockRejectedValue(apiError);

    try {
      await getUserIdentityProviderTokens("auth0|123", "github");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthError);
      expect(error).toMatchObject({
        code: OAuthErrorCode.CONNECTION_FAILED,
        provider: "github",
      });
    }
  });
});

describe("getProviderAccessToken", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetUser.mockReset();
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

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockResolvedValue(mockUser);

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

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockResolvedValue(mockUser);

    const token = await getProviderAccessToken("github", mockRequest);

    expect(mockGetSession).toHaveBeenCalledWith(mockRequest);
    expect(token).toStrictEqual("gho_testtoken123");
  });

  test("セッションが存在しない場合、UNAUTHORIZEDエラーをスローする", async () => {
    mockGetSession.mockResolvedValue(null);

    try {
      await getProviderAccessToken("github");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthError);
      expect(error).toMatchObject({
        code: OAuthErrorCode.UNAUTHORIZED,
        provider: "github",
      });
    }
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

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockResolvedValue(mockUser);

    try {
      await getProviderAccessToken("github");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthError);
      expect(error).toMatchObject({
        code: OAuthErrorCode.NO_ACCESS_TOKEN,
        provider: "github",
      });
    }
  });

  test("予期しないエラーの場合、UNKNOWN_ERRORをスローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockRejectedValue(new Error("Unexpected error"));

    try {
      await getProviderAccessToken("github");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthError);
      expect(error).toMatchObject({
        code: OAuthErrorCode.CONNECTION_FAILED,
        provider: "github",
      });
    }
  });
});

describe("checkOAuthConnection", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetUser.mockReset();
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

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockResolvedValue(mockUser);

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

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockResolvedValue(mockUser);

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(false);
  });

  test("未認証の場合はfalseを返す", async () => {
    mockGetSession.mockResolvedValue(null);

    const isConnected = await checkOAuthConnection("github");

    expect(isConnected).toStrictEqual(false);
  });

  test("接続エラーが発生した場合はエラーを再スローする", async () => {
    const mockSession: MockSession = {
      user: { sub: "auth0|123" },
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUser.mockRejectedValue(new Error("Connection failed"));

    try {
      await checkOAuthConnection("github");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(OAuthError);
      expect(error).toMatchObject({
        code: OAuthErrorCode.CONNECTION_FAILED,
        provider: "github",
      });
    }
  });
});
