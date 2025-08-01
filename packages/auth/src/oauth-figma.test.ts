import { beforeEach, describe, expect, test, vi } from "vitest";

import { OAuthErrorCode } from "./errors.js";
import {
  checkOAuthConnection,
  getProviderAccessToken,
  getUserIdentityProviderTokens,
  startOAuthFlow,
} from "./oauth.js";

// モックの設定
vi.mock("./clients.js", () => ({
  auth0OAuth: {
    getSession: vi.fn(() => Promise.resolve(null)),
  },
  managementClient: {
    users: {
      get: vi.fn(() => Promise.resolve({ data: { identities: [] } })),
    },
  },
}));

describe("Figma OAuth認証", () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();
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

      const { managementClient } = await import("./clients.js");
      vi.mocked(managementClient.users.get).mockResolvedValue(mockUser);

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

      const { managementClient } = await import("./clients.js");
      vi.mocked(managementClient.users.get).mockResolvedValue(mockUser);

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

      const { auth0OAuth, managementClient } = await import("./clients.js");
      vi.mocked(auth0OAuth.getSession).mockResolvedValue(mockSession);
      vi.mocked(managementClient.users.get).mockResolvedValue(mockUser);

      const result = await getProviderAccessToken("figma");
      expect(result).toStrictEqual("figma_access_token_456");
    });

    test("セッションが存在しない場合はUNAUTHORIZEDエラーをスローする", async () => {
      const { auth0OAuth } = await import("./clients.js");
      vi.mocked(auth0OAuth.getSession).mockResolvedValue(null);

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

      const { auth0OAuth, managementClient } = await import("./clients.js");
      vi.mocked(auth0OAuth.getSession).mockResolvedValue(mockSession);
      vi.mocked(managementClient.users.get).mockResolvedValue(mockUser);

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

      const { auth0OAuth, managementClient } = await import("./clients.js");
      vi.mocked(auth0OAuth.getSession).mockResolvedValue(mockSession);
      vi.mocked(managementClient.users.get).mockResolvedValue(mockUser);

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

      const { auth0OAuth, managementClient } = await import("./clients.js");
      vi.mocked(auth0OAuth.getSession).mockResolvedValue(mockSession);
      vi.mocked(managementClient.users.get).mockResolvedValue(mockUser);

      const result = await checkOAuthConnection("figma");
      expect(result).toStrictEqual(false);
    });

    test("セッションが存在しない場合はfalseを返す", async () => {
      const { auth0OAuth } = await import("./clients.js");
      vi.mocked(auth0OAuth.getSession).mockResolvedValue(null);

      const result = await checkOAuthConnection("figma");
      expect(result).toStrictEqual(false);
    });
  });
});
