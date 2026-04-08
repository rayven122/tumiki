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
vi.mock("../oauth.repository");
vi.mock("../../mcp/mcp.service");

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
import * as oauthRepository from "../oauth.repository";
import { createFromCatalog } from "../../mcp/mcp.service";
import { createMcpOAuthManager } from "../oauth.service";
import type { StartOAuthInput } from "../oauth.types";
import type * as oauth from "oauth4webapi";

describe("oauth.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  const defaultInput: StartOAuthInput = {
    catalogId: 1,
    catalogName: "Figma MCP",
    description: "Figma MCP Server",
    transportType: "STREAMABLE_HTTP",
    command: null,
    args: "[]",
    url: "https://mcp.figma.com/mcp",
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
  });

  describe("startAuthFlow", () => {
    test("DCRキャッシュなし時にDiscovery + DCR + ブラウザオープンする", async () => {
      // DCRキャッシュなし
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce(null);
      vi.mocked(discoverOAuthMetadata).mockResolvedValueOnce(mockMetadata);
      vi.mocked(performDCR).mockResolvedValueOnce({
        metadata: mockMetadata,
        registration: mockClient,
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      // Discovery + DCR が呼ばれる
      expect(discoverOAuthMetadata).toHaveBeenCalledWith(
        "https://mcp.figma.com/mcp",
      );
      expect(performDCR).toHaveBeenCalledWith(mockMetadata);

      // DCR結果がキャッシュされる
      expect(oauthRepository.upsertOAuthClient).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          serverUrl: "https://mcp.figma.com/mcp",
          clientId: "test-client-id",
        }),
      );

      // ブラウザが開かれる
      expect(shell.openExternal).toHaveBeenCalledWith(
        "https://www.figma.com/oauth?client_id=test",
      );

      // セッションが保存される
      expect(manager.getActiveSession()).not.toBeNull();
      expect(manager.getActiveSession()?.state).toBe("test-state");
    });

    test("DCRキャッシュあり時にDiscovery + DCRをスキップする", async () => {
      // DCRキャッシュあり
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      // Discovery + DCR は呼ばれない
      expect(discoverOAuthMetadata).not.toHaveBeenCalled();
      expect(performDCR).not.toHaveBeenCalled();

      // ブラウザが開かれる
      expect(shell.openExternal).toHaveBeenCalled();
    });

    test("キャッシュのメタデータが壊れている場合削除してDiscoveryし直す", async () => {
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: "{}",
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
      expect(discoverOAuthMetadata).toHaveBeenCalledWith(
        "https://mcp.figma.com/mcp",
      );
      expect(performDCR).toHaveBeenCalledWith(mockMetadata);
      expect(shell.openExternal).toHaveBeenCalled();
      expect(manager.getActiveSession()?.state).toBe("test-state");
    });

    test("キャッシュにauthorization_endpointが無い場合削除してDiscoveryし直す", async () => {
      const metadataWithoutAuthz = {
        issuer: "https://www.figma.com",
        token_endpoint: "https://www.figma.com/api/oauth/token",
        registration_endpoint: "https://www.figma.com/api/oauth/register",
        scopes_supported: ["files:read"],
      };
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "cached-client-id",
        clientSecret: "cached-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(metadataWithoutAuthz),
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
      expect(performDCR).toHaveBeenCalled();
      expect(shell.openExternal).toHaveBeenCalled();
      expect(manager.getActiveSession()?.state).toBe("test-state");
    });

    test("DCR非対応時にユーザー入力のclient_id/secretでフォールバックする", async () => {
      // DCRキャッシュなし
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce(null);

      // Discovery成功だがregistration_endpointなし
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

      // DCRは呼ばれない
      expect(performDCR).not.toHaveBeenCalled();

      // OAuthClientにキャッシュ保存される
      expect(oauthRepository.upsertOAuthClient).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          clientId: "manual-client-id",
          clientSecret: "manual-secret",
        }),
      );

      // ブラウザが開かれる
      expect(shell.openExternal).toHaveBeenCalled();
    });

    test("DCR非対応でclient_id未入力の場合エラーをスローする", async () => {
      // DCRキャッシュなし
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValueOnce(null);

      // Discovery成功だがregistration_endpointなし
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
  });

  describe("handleCallback", () => {
    test("コールバックでトークン交換しMCPサーバーを作成する", async () => {
      // セッション開始
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      // コールバック
      vi.mocked(parseOAuthCallback).mockReturnValueOnce({
        code: "auth-code",
        state: "test-state",
      });
      vi.mocked(exchangeCodeForToken).mockResolvedValueOnce({
        access_token: "access123",
        refresh_token: "refresh456",
        expires_at: 1700000000,
        scope: "files:read",
      });
      vi.mocked(createFromCatalog).mockResolvedValueOnce({
        serverId: 42,
        serverName: "Figma MCP",
      });

      const result = await manager.handleCallback(
        "tumiki://oauth/callback?code=auth-code&state=test-state",
      );

      expect(result).toStrictEqual({
        serverId: 42,
        serverName: "Figma MCP",
      });

      // createFromCatalogにOAuthトークンが渡される
      expect(createFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: "OAUTH",
          credentials: expect.objectContaining({
            access_token: "access123",
            refresh_token: "refresh456",
          }),
        }),
      );

      // セッションがクリアされる
      expect(manager.getActiveSession()).toBeNull();
    });

    test("セッションが存在しない場合エラーをスローする", async () => {
      vi.mocked(parseOAuthCallback).mockReturnValueOnce({
        code: "auth-code",
        state: "test-state",
      });

      const manager = createMcpOAuthManager();

      await expect(
        manager.handleCallback(
          "tumiki://oauth/callback?code=auth-code&state=test-state",
        ),
      ).rejects.toThrow("MCP OAuth認証セッションが存在しません");
    });

    test("stateが一致しない場合エラーをスローする", async () => {
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      vi.mocked(parseOAuthCallback).mockReturnValueOnce({
        code: "auth-code",
        state: "wrong-state",
      });

      await expect(
        manager.handleCallback(
          "tumiki://oauth/callback?code=auth-code&state=wrong-state",
        ),
      ).rejects.toThrow("stateパラメータが一致しません");
    });

    test("セッションタイムアウトの場合エラーをスローする", async () => {
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);

      // セッション開始時刻を過去に設定
      const session = manager.getActiveSession();
      if (session) {
        session.createdAt = new Date(Date.now() - 6 * 60 * 1000); // 6分前
      }

      vi.mocked(parseOAuthCallback).mockReturnValueOnce({
        code: "auth-code",
        state: "test-state",
      });

      await expect(
        manager.handleCallback(
          "tumiki://oauth/callback?code=auth-code&state=test-state",
        ),
      ).rejects.toThrow("有効期限が切れています");
    });
  });

  describe("cancelAuthFlow", () => {
    test("セッションをクリアする", async () => {
      vi.mocked(oauthRepository.findByServerUrl).mockResolvedValue({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: JSON.stringify(mockMetadata),
      });

      const manager = createMcpOAuthManager();
      await manager.startAuthFlow(defaultInput);
      expect(manager.getActiveSession()).not.toBeNull();

      manager.cancelAuthFlow();
      expect(manager.getActiveSession()).toBeNull();
    });
  });
});
