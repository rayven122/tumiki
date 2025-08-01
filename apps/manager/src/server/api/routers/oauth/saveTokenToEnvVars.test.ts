import { describe, test, expect, beforeEach, vi } from "vitest";
import { saveTokenToEnvVars } from "./saveTokenToEnvVars";
import type { ProtectedContext } from "../../trpc";

// @tumiki/auth/serverのモック
vi.mock("@tumiki/auth/server", () => ({
  getProviderAccessToken: vi.fn(() => Promise.resolve("test-token-123")),
}));

describe("saveTokenToEnvVars", () => {
  let mockCtx: ProtectedContext;
  let mockFindUnique: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // モック関数を作成
    mockFindUnique = vi.fn(() =>
      Promise.resolve({
        id: "config-123",
        userId: "user-123",
        envVars: JSON.stringify({ EXISTING_KEY: "existing-value" }),
        mcpServer: {
          envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN", "EXISTING_KEY"],
        },
      }),
    );

    mockUpdate = vi.fn(() =>
      Promise.resolve({
        id: "config-123",
        envVars: JSON.stringify({
          EXISTING_KEY: "existing-value",
          GITHUB_PERSONAL_ACCESS_TOKEN: "test-token-123",
        }),
      }),
    );

    // コンテキストのモック作成
    mockCtx = {
      session: {
        user: {
          id: "user-123",
        },
      },
      db: {
        userMcpServerConfig: {
          findUnique: mockFindUnique as unknown,
          update: mockUpdate as unknown,
        },
      },
    } as unknown as ProtectedContext;

    // モックをリセット
    vi.clearAllMocks();
  });

  test("GitHubのアクセストークンをenvVarsに保存できる", async () => {
    const input = {
      userMcpServerConfigId: "config-123",
      provider: "github" as const,
      tokenKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
      scopes: ["repo", "read:user"],
    };

    const result = await saveTokenToEnvVars({ ctx: mockCtx, input });

    // 結果の検証
    expect(result).toStrictEqual({
      success: true,
      message:
        "githubのアクセストークンがGITHUB_PERSONAL_ACCESS_TOKENに保存されました",
      configId: "config-123",
    });

    // データベース更新の検証
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "config-123" },
      data: {
        envVars: JSON.stringify({
          EXISTING_KEY: "existing-value",
          GITHUB_PERSONAL_ACCESS_TOKEN: "test-token-123",
        }),
        oauthConnection: "github",
        oauthScopes: ["repo", "read:user"],
      },
    });
  });

  test("MCPサーバー設定が見つからない場合はエラーになる", async () => {
    mockFindUnique.mockImplementationOnce(() => Promise.resolve(null));

    const input = {
      userMcpServerConfigId: "config-999",
      provider: "github" as const,
      tokenKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
    };

    await expect(saveTokenToEnvVars({ ctx: mockCtx, input })).rejects.toThrow(
      "MCPサーバー設定が見つかりません",
    );
  });

  test("他のユーザーのMCPサーバー設定にはアクセスできない", async () => {
    mockFindUnique.mockImplementationOnce(() =>
      Promise.resolve({
        id: "config-123",
        userId: "other-user-456",
        envVars: "{}",
        mcpServer: {
          envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
        },
      }),
    );

    const input = {
      userMcpServerConfigId: "config-123",
      provider: "github" as const,
      tokenKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
    };

    await expect(saveTokenToEnvVars({ ctx: mockCtx, input })).rejects.toThrow(
      "このMCPサーバー設定にアクセスする権限がありません",
    );
  });

  test("MCPサーバーがサポートしていない環境変数はエラーになる", async () => {
    mockFindUnique.mockImplementationOnce(() =>
      Promise.resolve({
        id: "config-123",
        userId: "user-123",
        envVars: "{}",
        mcpServer: {
          envVars: ["OTHER_TOKEN"],
        },
      }),
    );

    const input = {
      userMcpServerConfigId: "config-123",
      provider: "github" as const,
      tokenKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
    };

    await expect(saveTokenToEnvVars({ ctx: mockCtx, input })).rejects.toThrow(
      "このMCPサーバーはGITHUB_PERSONAL_ACCESS_TOKEN環境変数をサポートしていません",
    );
  });

  test("アクセストークンが取得できない場合はエラーになる", async () => {
    const { getProviderAccessToken } = await import("@tumiki/auth/server");
    vi.mocked(getProviderAccessToken).mockResolvedValueOnce(null);

    const input = {
      userMcpServerConfigId: "config-123",
      provider: "github" as const,
      tokenKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
    };

    await expect(saveTokenToEnvVars({ ctx: mockCtx, input })).rejects.toThrow(
      "githubのアクセストークンが取得できませんでした",
    );
  });
});
