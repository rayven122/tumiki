import { describe, test, expect, vi, beforeEach } from "vitest";

// モック設定（テスト対象のインポートより前に）
vi.mock("electron", () => ({
  shell: { openExternal: vi.fn() },
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../../../utils/encryption");
vi.mock("../../../auth/pkce");
vi.mock("../oauth.discovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../oauth.discovery")>();
  return { ...actual, discoverOAuthMetadata: vi.fn() };
});
vi.mock("../oauth.dcr");
vi.mock("../oauth.auth-url");
vi.mock("../oauth.token");
vi.mock("../oauth.protocol");
vi.mock("../oauth.loopback");
vi.mock("../oauth.repository");
vi.mock("../../mcp-server-list/mcp.service");
vi.mock("../../mcp-server-list/mcp.repository");
vi.mock("../../mcp-proxy/mcp-proxy.service", () => ({
  fetchToolsForConnection: vi.fn(),
  ToolFetchError: class ToolFetchError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ToolFetchError";
    }
  },
}));
vi.mock("../../../shared/profile-dispatch");

import { shell } from "electron";
import { getDb } from "../../../shared/db";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../../../auth/pkce";
import { discoverOAuthMetadata } from "../oauth.discovery";
import { performDCR } from "../oauth.dcr";
import { generateAuthorizationUrl } from "../oauth.auth-url";
import { exchangeCodeForToken } from "../oauth.token";
import { parseOAuthCallback } from "../oauth.protocol";
import { startLoopbackServer, type LoopbackServer } from "../oauth.loopback";
import * as oauthRepository from "../oauth.repository";
import * as mcpRepository from "../../mcp-server-list/mcp.repository";
import {
  fetchToolsForConnection,
  ToolFetchError,
} from "../../mcp-proxy/mcp-proxy.service";
import {
  createFromCatalog,
  createFromManagerCatalog,
} from "../../mcp-server-list/mcp.service";
import { encryptToken } from "../../../utils/encryption";
import { resolveByProfile } from "../../../shared/profile-dispatch";
import { createMcpOAuthManager } from "../oauth.service";
import type { StartOAuthInput } from "../oauth.types";
import type * as oauth from "oauth4webapi";

const TEST_REDIRECT_URI = "http://127.0.0.1:50123/callback";
const TEST_CALLBACK_URL = `${TEST_REDIRECT_URI}?code=auth-code&state=test-state`;

const buildLoopback = (
  callbackUrl: string = TEST_CALLBACK_URL,
): LoopbackServer => ({
  redirectUri: TEST_REDIRECT_URI,
  waitForCallback: vi.fn().mockResolvedValue(callbackUrl),
  close: vi.fn().mockResolvedValue(undefined),
});

describe("oauth.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  const defaultManagerCatalog: NonNullable<StartOAuthInput["managerCatalog"]> =
    {
      catalogId: "1",
      status: "available",
      permissions: { read: true, write: true, execute: true },
      connectionTemplate: {
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: [],
        url: "https://mcp.figma.com/mcp",
        authType: "OAUTH",
        credentialKeys: [],
      },
      tools: [],
    };

  const defaultInput: StartOAuthInput = {
    catalogName: "Figma MCP",
    description: "Figma MCP Server",
    transportType: "STREAMABLE_HTTP",
    command: null,
    args: "[]",
    url: "https://mcp.figma.com/mcp",
    managerCatalog: defaultManagerCatalog,
  };

  const mockMetadata: oauth.AuthorizationServer = {
    issuer: "https://www.figma.com",
    authorization_endpoint: "https://www.figma.com/oauth",
    token_endpoint: "https://www.figma.com/api/oauth/token",
    registration_endpoint: "https://www.figma.com/api/oauth/register",
    scopes_supported: ["files:read"],
  };

  const mockClient: oauth.Client = {
    client_id: "test-client-id",
    client_secret: "test-secret",
    token_endpoint_auth_method: "client_secret_post",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(generateCodeVerifier).mockReturnValue("test-verifier");
    vi.mocked(generateCodeChallenge).mockReturnValue("test-challenge");
    vi.mocked(generateState).mockReturnValue("test-state");
    vi.mocked(generateAuthorizationUrl).mockReturnValue(
      new URL("https://www.figma.com/oauth?client_id=test"),
    );
    // 既定では個人モードとして振る舞う（テストごとに上書き可）
    vi.mocked(resolveByProfile).mockImplementation(async (handlers) =>
      handlers.personal(),
    );
    vi.mocked(parseOAuthCallback).mockReturnValue({
      code: "auth-code",
      state: "test-state",
    });
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "access123",
      refresh_token: "refresh456",
      expires_at: 1700000000,
      scope: "files:read",
    });
    vi.mocked(createFromCatalog).mockResolvedValue({
      serverId: 42,
      serverName: "Figma MCP",
    });
  });

  describe("startAuthFlow", () => {
    test("DCRキャッシュなし時にDiscovery + DCR + ループバック受信 + トークン交換まで実行する", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce(null);
      vi.mocked(discoverOAuthMetadata).mockResolvedValueOnce(mockMetadata);
      vi.mocked(performDCR).mockResolvedValueOnce({
        metadata: mockMetadata,
        registration: mockClient,
      });

      const manager = createMcpOAuthManager();
      const result = await manager.startAuthFlow(defaultInput);

      expect(startLoopbackServer).toHaveBeenCalled();
      expect(discoverOAuthMetadata).toHaveBeenCalledWith(
        "https://mcp.figma.com/mcp",
      );
      expect(performDCR).toHaveBeenCalledWith(mockMetadata, TEST_REDIRECT_URI);

      expect(oauthRepository.upsertOAuthClient).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          serverUrl: "https://mcp.figma.com/mcp",
          clientId: "test-client-id",
        }),
      );

      expect(shell.openExternal).toHaveBeenCalledWith(
        "https://www.figma.com/oauth?client_id=test",
      );

      expect(exchangeCodeForToken).toHaveBeenCalledWith(
        mockMetadata,
        expect.objectContaining({ client_id: "test-client-id" }),
        new URL(TEST_CALLBACK_URL),
        TEST_REDIRECT_URI,
        "test-verifier",
        "test-state",
      );

      expect(result).toStrictEqual({
        serverId: 42,
        serverName: "Figma MCP",
      });

      // 完了時にセッションがクリアされる
      expect(manager.getActiveSession()).toBeNull();
    });

    test("DCRキャッシュあり時にDiscovery + DCRをスキップする", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      expect(discoverOAuthMetadata).not.toHaveBeenCalled();
      expect(performDCR).not.toHaveBeenCalled();
      expect(shell.openExternal).toHaveBeenCalled();
    });

    test("キャッシュのメタデータが壊れている場合削除してDiscoveryし直す", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: "{}",
        isDcr: true,
      });

      vi.mocked(discoverOAuthMetadata).mockResolvedValueOnce(mockMetadata);
      vi.mocked(performDCR).mockResolvedValueOnce({
        metadata: mockMetadata,
        registration: mockClient,
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      expect(oauthRepository.deleteByServerUrl).toHaveBeenCalledWith(
        mockDb,
        "https://mcp.figma.com/mcp",
      );
      expect(discoverOAuthMetadata).toHaveBeenCalled();
      expect(performDCR).toHaveBeenCalledWith(mockMetadata, TEST_REDIRECT_URI);
    });

    test("DCR非対応時にユーザー入力のclient_id/secretでフォールバックする", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce(null);

      const metadataWithoutDCR = {
        ...mockMetadata,
        registration_endpoint: undefined,
      };
      vi.mocked(discoverOAuthMetadata).mockResolvedValueOnce(
        metadataWithoutDCR,
      );

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow({
        ...defaultInput,
        oauthClientId: "manual-client-id",
        oauthClientSecret: "manual-secret",
      });

      expect(performDCR).not.toHaveBeenCalled();
      expect(oauthRepository.upsertOAuthClient).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          clientId: "manual-client-id",
          clientSecret: "manual-secret",
        }),
      );
      expect(shell.openExternal).toHaveBeenCalled();
    });

    test("DCR非対応でclient_id未入力の場合エラーをスローする", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce(null);

      const metadataWithoutDCR = {
        ...mockMetadata,
        registration_endpoint: undefined,
      };
      vi.mocked(discoverOAuthMetadata).mockResolvedValueOnce(
        metadataWithoutDCR,
      );

      const manager = createMcpOAuthManager();
      await expect(manager.startAuthFlow(defaultInput)).rejects.toThrow(
        "does not support Dynamic Client Registration",
      );
    });

    test("組織モードでは Manager API カタログから登録する", async () => {
      vi.mocked(resolveByProfile).mockImplementation(async (handlers) =>
        handlers.organization(),
      );
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });
      vi.mocked(createFromManagerCatalog).mockResolvedValueOnce({
        serverId: 99,
        serverName: "Figma MCP",
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow({
        ...defaultInput,
        managerCatalog: {
          ...defaultManagerCatalog,
          catalogId: "manager-catalog-uuid",
        },
      });

      expect(createFromManagerCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          catalogId: "manager-catalog-uuid",
          serverName: "Figma MCP",
        }),
      );
      expect(createFromCatalog).not.toHaveBeenCalled();
    });

    test("個人モードで managerCatalog.catalogId が数値変換できない場合エラーをスローする", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });

      const manager = createMcpOAuthManager();
      await expect(
        manager.startAuthFlow({
          ...defaultInput,
          managerCatalog: {
            ...defaultManagerCatalog,
            catalogId: "not-a-number",
          },
        }),
      ).rejects.toThrow("カタログIDが不正です");
    });

    test("stateが一致しない場合エラーをスローする", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });
      vi.mocked(parseOAuthCallback).mockReturnValueOnce({
        code: "auth-code",
        state: "wrong-state",
      });

      const manager = createMcpOAuthManager();
      await expect(manager.startAuthFlow(defaultInput)).rejects.toThrow(
        "stateパラメータが一致しません",
      );
    });

    test("ループバックタイムアウト時にエラーが伝播する", async () => {
      const loopback: LoopbackServer = {
        redirectUri: TEST_REDIRECT_URI,
        waitForCallback: vi
          .fn()
          .mockRejectedValue(new Error("OAuth認証がタイムアウトしました")),
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(loopback);
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });

      const manager = createMcpOAuthManager();
      await expect(manager.startAuthFlow(defaultInput)).rejects.toThrow(
        "OAuth認証がタイムアウトしました",
      );
      expect(loopback.close).toHaveBeenCalled();
    });
  });

  describe("cancelAuthFlow", () => {
    test("ループバックサーバーをクローズする", async () => {
      const loopback = buildLoopback();
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(loopback);
      // waitForCallback を解決させずに保留状態にする
      vi.mocked(loopback.waitForCallback).mockReturnValue(
        new Promise(() => {
          /* never */
        }),
      );
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });

      const manager = createMcpOAuthManager();
      // 開始は await しない（解決しないため）
      void manager.startAuthFlow(defaultInput).catch(() => {
        /* キャンセル時のエラーは無視 */
      });

      // ブラウザオープン後にセッションが立っていることを確認するため少し待つ
      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.cancelAuthFlow();
      // 即時に nullable とは限らないが、close が呼ばれることを期待
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(loopback.close).toHaveBeenCalled();
    });
  });

  describe("reauthenticateConnection", () => {
    const baseConnection = {
      id: 7,
      name: "Figma",
      slug: "figma",
      transportType: "STREAMABLE_HTTP" as const,
      command: null,
      args: "[]",
      url: "https://mcp.figma.com/mcp",
      authType: "OAUTH" as const,
      isEnabled: true,
      displayOrder: 0,
      serverId: 11,
      catalogId: null,
      secretId: 33,
      iconPath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      server: {
        id: 11,
        name: "Figma MCP",
        slug: "figma-mcp",
        description: "",
        serverType: "OFFICIAL" as const,
        serverStatus: "RUNNING" as const,
        isEnabled: true,
        isPiiMaskingEnabled: false,
        isToonConversionEnabled: false,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      secret: { credentials: "encrypted" },
    };

    beforeEach(() => {
      vi.mocked(encryptToken).mockResolvedValue("encrypted-credentials");
      // tools/list 検証はデフォルト成功にする。失敗ケースは個別に上書きする。
      vi.mocked(fetchToolsForConnection).mockResolvedValue([]);
    });

    test("OAuthコネクトの再認証でキャッシュ済みクライアントを再利用し既存Secretを更新する", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce(baseConnection);
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });

      const manager = createMcpOAuthManager();
      const result = await manager.reauthenticateConnection({
        connectionId: 7,
      });

      expect(discoverOAuthMetadata).not.toHaveBeenCalled();
      expect(performDCR).not.toHaveBeenCalled();
      // 新規登録系は呼ばれないこと
      expect(createFromCatalog).not.toHaveBeenCalled();
      expect(createFromManagerCatalog).not.toHaveBeenCalled();
      // 既存Secret を更新すること
      expect(oauthRepository.updateSecretCredentials).toHaveBeenCalledWith(
        mockDb,
        33,
        "encrypted-credentials",
      );
      expect(result).toStrictEqual({
        connectionId: 7,
        serverId: 11,
        serverName: "Figma MCP",
        connectionName: "Figma",
      });
    });

    test("非DCRクライアントもキャッシュから流用できる（手動入力クライアントの再認証）", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce(baseConnection);
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "manual-client-id",
        clientSecret: "manual-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: false,
      });

      const manager = createMcpOAuthManager();
      await manager.reauthenticateConnection({ connectionId: 7 });

      expect(discoverOAuthMetadata).not.toHaveBeenCalled();
      expect(oauthRepository.updateSecretCredentials).toHaveBeenCalled();
    });

    // 以下のエラーケースは loopback 起動前に弾かれるため startLoopbackServer はモック不要

    test("コネクトが存在しない場合エラーをスローする", async () => {
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce(null);

      const manager = createMcpOAuthManager();
      await expect(
        manager.reauthenticateConnection({ connectionId: 999 }),
      ).rejects.toThrow("対象のMCP接続が見つかりません");
      expect(oauthRepository.updateSecretCredentials).not.toHaveBeenCalled();
    });

    test("OAuth以外のコネクトはエラーをスローする", async () => {
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce({
        ...baseConnection,
        authType: "BEARER" as const,
      });

      const manager = createMcpOAuthManager();
      await expect(
        manager.reauthenticateConnection({ connectionId: 7 }),
      ).rejects.toThrow("この接続はOAuth認証ではありません");
      expect(oauthRepository.updateSecretCredentials).not.toHaveBeenCalled();
    });

    test("URLが空のOAuthコネクトはエラーをスローする", async () => {
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce({
        ...baseConnection,
        url: null,
      });

      const manager = createMcpOAuthManager();
      await expect(
        manager.reauthenticateConnection({ connectionId: 7 }),
      ).rejects.toThrow("OAuth認証にはサーバーURLが必要です");
    });

    test("tools/list 検証に失敗したら markSecretNeedsReauth を呼んでエラーをスローする", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce(baseConnection);
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });
      // tools/list が失敗するケース（provider 側でトークンが拒否される）
      vi.mocked(fetchToolsForConnection).mockRejectedValueOnce(
        new Error("connection not found"),
      );

      const manager = createMcpOAuthManager();
      await expect(
        manager.reauthenticateConnection({ connectionId: 7 }),
      ).rejects.toThrow("新しいOAuthトークンの検証に失敗しました");
      // updateSecretCredentials は先に呼ばれて needsReauth を一旦 false にしたが、
      // 検証失敗で再度 markSecretNeedsReauth が呼ばれる
      expect(oauthRepository.updateSecretCredentials).toHaveBeenCalledWith(
        mockDb,
        33,
        "encrypted-credentials",
      );
      expect(oauthRepository.markSecretNeedsReauth).toHaveBeenCalledWith(
        mockDb,
        33,
      );
    });

    test("ToolFetchError 発生時はプロバイダ拒否を示す専用メッセージで失敗する", async () => {
      vi.mocked(startLoopbackServer).mockResolvedValueOnce(buildLoopback());
      vi.mocked(
        mcpRepository.findConnectionByIdWithServer,
      ).mockResolvedValueOnce(baseConnection);
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
        isDcr: true,
      });
      // tools/list が ToolFetchError で失敗するケース（プロバイダ側でトークン拒否）
      vi.mocked(fetchToolsForConnection).mockRejectedValueOnce(
        new ToolFetchError("upstream rejected"),
      );

      const manager = createMcpOAuthManager();
      await expect(
        manager.reauthenticateConnection({ connectionId: 7 }),
      ).rejects.toThrow(
        "新しいOAuthトークンでツール一覧の取得に失敗しました（プロバイダ側でトークンが受け付けられていません）",
      );
      expect(oauthRepository.markSecretNeedsReauth).toHaveBeenCalledWith(
        mockDb,
        33,
      );
    });
  });

  describe("findManualOAuthClient", () => {
    test("キャッシュあり時に復号化済みクレデンシャルを返す", async () => {
      vi.mocked(
        oauthRepository.findManualClientByServerUrl,
      ).mockResolvedValueOnce({
        clientId: "id",
        clientSecret: "secret",
      });

      const manager = createMcpOAuthManager();
      const result = await manager.findManualOAuthClient("https://example.com");

      expect(result).toStrictEqual({
        clientId: "id",
        clientSecret: "secret",
      });
      expect(oauthRepository.findManualClientByServerUrl).toHaveBeenCalledWith(
        mockDb,
        "https://example.com",
      );
    });

    test("キャッシュなし時にnullを返す", async () => {
      vi.mocked(
        oauthRepository.findManualClientByServerUrl,
      ).mockResolvedValueOnce(null);

      const manager = createMcpOAuthManager();
      const result = await manager.findManualOAuthClient("https://unknown.com");

      expect(result).toStrictEqual(null);
    });
  });
});
