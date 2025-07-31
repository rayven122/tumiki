import { beforeEach, describe, expect, mock, test } from "bun:test";

import { OAuthErrorCode } from "./errors.js";
import {
  checkOAuthConnection,
  getProviderAccessToken,
  getUserIdentityProviderTokens,
  startOAuthFlow,
} from "./oauth.js";

// モックの設定
void mock.module("./clients.js", () => ({
  auth0OAuth: {
    getSession: mock(() => Promise.resolve(null)),
  },
  managementClient: {
    users: {
      get: mock(() => Promise.resolve({ data: { identities: [] } })),
    },
  },
}));

describe("Figma OAuth認証", () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    mock.restore();
    void mock.module("./clients.js", () => ({
      auth0OAuth: {
        getSession: mock(() => Promise.resolve(null)),
      },
      managementClient: {
        users: {
          get: mock(() => Promise.resolve({ data: { identities: [] } })),
        },
      },
    }));
  });

  describe("getUserIdentityProviderTokens", () => {
    test("Figmaのアクセストークンを正常に取得できる", async () => {
      const mockUser = {
        data: {
          identities: [
            {
              connection: "figma",
              access_token: "figma_test_token_123",
            },
          ],
        },
      };

      void mock.module("./clients.js", () => ({
        managementClient: {
          users: {
            get: mock(() => Promise.resolve(mockUser)),
          },
        },
      }));

      const result = await getUserIdentityProviderTokens("user123", "figma");
      expect(result).toStrictEqual("figma_test_token_123");
    });

    test("Figmaのidentityが存在しない場合はnullを返す", async () => {
      const mockUser = {
        data: {
          identities: [
            {
              connection: "github",
              access_token: "github_token",
            },
          ],
        },
      };

      void mock.module("./clients.js", () => ({
        managementClient: {
          users: {
            get: mock(() => Promise.resolve(mockUser)),
          },
        },
      }));

      const result = await getUserIdentityProviderTokens("user123", "figma");
      expect(result).toStrictEqual(null);
    });
  });

  describe("getProviderAccessToken", () => {
    test("Figmaのアクセストークンを正常に取得できる", async () => {
      const mockSession = {
        user: {
          sub: "auth0|user123",
        },
      };

      const mockUser = {
        data: {
          identities: [
            {
              connection: "figma",
              access_token: "figma_access_token_456",
            },
          ],
        },
      };

      void mock.module("./clients.js", () => ({
        auth0OAuth: {
          getSession: mock(() => Promise.resolve(mockSession)),
        },
        managementClient: {
          users: {
            get: mock(() => Promise.resolve(mockUser)),
          },
        },
      }));

      const result = await getProviderAccessToken("figma");
      expect(result).toStrictEqual("figma_access_token_456");
    });

    test("セッションが存在しない場合はUNAUTHORIZEDエラーをスローする", async () => {
      void mock.module("./clients.js", () => ({
        auth0OAuth: {
          getSession: mock(() => Promise.resolve(null)),
        },
      }));

      void expect(getProviderAccessToken("figma")).rejects.toMatchObject({
        name: "OAuthError",
        code: OAuthErrorCode.UNAUTHORIZED,
        provider: "figma",
      });
    });

    test("Figmaトークンが存在しない場合はNO_ACCESS_TOKENエラーをスローする", async () => {
      const mockSession = {
        user: {
          sub: "auth0|user123",
        },
      };

      const mockUser = {
        data: {
          identities: [],
        },
      };

      void mock.module("./clients.js", () => ({
        auth0OAuth: {
          getSession: mock(() => Promise.resolve(mockSession)),
        },
        managementClient: {
          users: {
            get: mock(() => Promise.resolve(mockUser)),
          },
        },
      }));

      void expect(getProviderAccessToken("figma")).rejects.toMatchObject({
        name: "OAuthError",
        code: OAuthErrorCode.NO_ACCESS_TOKEN,
        provider: "figma",
      });
    });
  });

  describe("startOAuthFlow", () => {
    test("Figma用の正しいログインURLを生成する", async () => {
      const config = {
        provider: "figma" as const,
        scopes: ["file_read"],
      };

      const result = await startOAuthFlow(config, "/mcp/servers");

      expect(result).toContain("/oauth/auth/login");
      expect(result).toContain("connection=figma");
      expect(result).toContain("scope=openid+profile+email+file_read");
      expect(result).toContain("returnTo=%2Fmcp%2Fservers");
      expect(result).toContain("prompt=consent");
    });

    test("複数のスコープを正しく処理する", async () => {
      const config = {
        provider: "figma" as const,
        scopes: ["file_read", "file_write", "webhooks"],
      };

      const result = await startOAuthFlow(config);

      expect(result).toContain("file_read+file_write+webhooks");
    });
  });

  describe("checkOAuthConnection", () => {
    test("Figmaトークンが存在する場合はtrueを返す", async () => {
      const mockSession = {
        user: {
          sub: "auth0|user123",
        },
      };

      const mockUser = {
        data: {
          identities: [
            {
              connection: "figma",
              access_token: "figma_token_789",
            },
          ],
        },
      };

      void mock.module("./clients.js", () => ({
        auth0OAuth: {
          getSession: mock(() => Promise.resolve(mockSession)),
        },
        managementClient: {
          users: {
            get: mock(() => Promise.resolve(mockUser)),
          },
        },
      }));

      const result = await checkOAuthConnection("figma");
      expect(result).toStrictEqual(true);
    });

    test("Figmaトークンが存在しない場合はfalseを返す", async () => {
      const mockSession = {
        user: {
          sub: "auth0|user123",
        },
      };

      const mockUser = {
        data: {
          identities: [],
        },
      };

      void mock.module("./clients.js", () => ({
        auth0OAuth: {
          getSession: mock(() => Promise.resolve(mockSession)),
        },
        managementClient: {
          users: {
            get: mock(() => Promise.resolve(mockUser)),
          },
        },
      }));

      const result = await checkOAuthConnection("figma");
      expect(result).toStrictEqual(false);
    });

    test("セッションが存在しない場合はfalseを返す", async () => {
      void mock.module("./clients.js", () => ({
        auth0OAuth: {
          getSession: mock(() => Promise.resolve(null)),
        },
      }));

      const result = await checkOAuthConnection("figma");
      expect(result).toStrictEqual(false);
    });
  });
});
