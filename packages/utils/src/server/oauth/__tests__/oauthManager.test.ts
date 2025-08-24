/**
 * OAuthManager のテスト
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { db } from "@tumiki/db/server";

import * as dcrClient from "../dcrClient.js";
import { createOAuthManager } from "../oauthManager.js";
import * as tokenManager from "../tokenManager.js";

// モック設定
vi.mock("@tumiki/db/server", () => ({
  db: {
    oAuthClient: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    oAuthSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    oAuthToken: {
      findUnique: vi.fn(),
    },
    userMcpServerConfig: {
      findFirst: vi.fn(),
    },
    mcpServer: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../dcrClient.js", () => ({
  discoverProtectedResource: vi.fn(),
  discoverAuthServer: vi.fn(),
  registerClient: vi.fn(),
  parseWWWAuthenticate: vi.fn(),
}));

vi.mock("../tokenManager.js", () => ({
  getValidToken: vi.fn(),
  saveToken: vi.fn(),
  refreshToken: vi.fn(),
  revokeToken: vi.fn(),
}));

describe("OAuthManager", () => {
  let oauthManager: ReturnType<typeof createOAuthManager>;

  beforeEach(() => {
    oauthManager = createOAuthManager({
      callbackBaseUrl: "http://localhost:8080",
      enablePKCE: true,
      enableDCR: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authenticate", () => {
    const mockMcpServerId = "test-mcp-server";
    const mockUserId = "test-user";
    const mockMcpServerUrl = "https://mcp.example.com";

    test("既存の有効なトークンがある場合は即座に返す", async () => {
      // Mock setup - organizationMemberとuserMcpServerConfigのモックを最初に設定
      vi.mocked(db.organizationMember.findFirst).mockResolvedValue({
        id: "member-1",
        userId: mockUserId,
        organizationId: "org-1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.userMcpServerConfig.findFirst).mockResolvedValue({
        id: "config-1",
        organizationId: "org-1",
        mcpServerId: mockMcpServerId,
        name: "Test Config",
        description: "Test Description",
        envVars: "",
        oauthConnection: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // OAuthClientが存在する場合
      vi.mocked(db.oAuthClient.findUnique).mockResolvedValue({
        id: "client-1",
        mcpServerId: mockMcpServerId,
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        registrationAccessToken: null,
        registrationClientUri: null,
        authorizationServerUrl: "https://auth.example.com",
        authorizationEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        registrationEndpoint: null,
        jwksUri: null,
        revocationEndpoint: null,
        introspectionEndpoint: null,
        protectedResourceUrl: null,
        resourceIndicator: null,
        tokenEndpointAuthMethod: "client_secret_basic",
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
        scopes: ["read", "write"],
        redirectUris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        applicationName: null,
        applicationUri: null,
        logoUri: null,
        contactEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 有効なトークンが既に存在する場合
      vi.mocked(tokenManager.getValidToken).mockResolvedValue("valid-token");

      // Execute
      const result = await oauthManager.authenticate(
        mockMcpServerId,
        mockUserId,
        mockMcpServerUrl,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe("valid-token");
      expect(result.requiresUserInteraction).toBeUndefined();
    });

    test("新規クライアント登録とセッション作成", async () => {
      // Mock setup
      vi.mocked(db.organizationMember.findFirst).mockResolvedValue({
        id: "member-1",
        userId: mockUserId,
        organizationId: "org-1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.userMcpServerConfig.findFirst).mockResolvedValue(null);

      vi.mocked(db.oAuthClient.findUnique).mockResolvedValue(null);
      vi.mocked(tokenManager.getValidToken).mockResolvedValue(null);

      vi.mocked(dcrClient.discoverProtectedResource).mockResolvedValue({
        resource: "https://mcp.example.com",
        authorization_servers: ["https://auth.example.com"],
        scopes_supported: ["read", "write"],
      });

      vi.mocked(dcrClient.discoverAuthServer).mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        registration_endpoint: "https://auth.example.com/register",
        scopes_supported: ["read", "write"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
      });

      vi.mocked(dcrClient.registerClient).mockResolvedValue({
        client_id: "new-client-id",
        client_secret: "new-client-secret",
        redirect_uris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "read write",
      });

      vi.mocked(db.oAuthClient.create).mockResolvedValue({
        id: "client-1",
        mcpServerId: mockMcpServerId,
        clientId: "new-client-id",
        clientSecret: "new-client-secret",
        registrationAccessToken: null,
        registrationClientUri: null,
        authorizationServerUrl: "https://auth.example.com",
        authorizationEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        registrationEndpoint: "https://auth.example.com/register",
        jwksUri: null,
        revocationEndpoint: null,
        introspectionEndpoint: null,
        protectedResourceUrl: null,
        resourceIndicator: null,
        tokenEndpointAuthMethod: "client_secret_basic",
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        scopes: ["read", "write"],
        redirectUris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        applicationName: null,
        applicationUri: null,
        logoUri: null,
        contactEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.oAuthSession.create).mockResolvedValue({
        id: "session-1",
        sessionId: "test-session-id",
        userId: mockUserId,
        mcpServerId: mockMcpServerId,
        state: "test-state",
        nonce: null,
        codeVerifier: "code-verifier",
        codeChallenge: "code-challenge",
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost:8080/oauth/callback/test-mcp-server",
        requestedScopes: [],
        status: "pending",
        expiresAt: new Date(Date.now() + 600000),
        errorCode: null,
        errorDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await oauthManager.authenticate(
        mockMcpServerId,
        mockUserId,
        mockMcpServerUrl,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.requiresUserInteraction).toBe(true);
      expect(result.authorizationUrl).toContain(
        "https://auth.example.com/authorize",
      );
      expect(result.authorizationUrl).toContain("client_id=new-client-id");
      expect(result.authorizationUrl).toContain("response_type=code");

      // Verify DCR was called
      expect(dcrClient.registerClient).toHaveBeenCalledWith(
        "https://auth.example.com/register",
        expect.objectContaining({
          redirect_uris: [
            "http://localhost:8080/oauth/callback/test-mcp-server",
          ],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
        }),
      );
    });

    test("WWW-Authenticateヘッダーの処理", async () => {
      const wwwAuthHeader =
        'Bearer realm="example", as_uri="https://auth.example.com"';

      // Mock setup
      vi.mocked(db.organizationMember.findFirst).mockResolvedValue({
        id: "member-1",
        userId: mockUserId,
        organizationId: "org-1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.userMcpServerConfig.findFirst).mockResolvedValue(null);

      vi.mocked(db.oAuthClient.findUnique).mockResolvedValue(null);
      vi.mocked(tokenManager.getValidToken).mockResolvedValue(null);

      vi.mocked(dcrClient.parseWWWAuthenticate).mockReturnValue({
        scheme: "Bearer",
        realm: "example",
        as_uri: "https://auth.example.com",
      });

      vi.mocked(dcrClient.discoverAuthServer).mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        registration_endpoint: "https://auth.example.com/register",
      });

      vi.mocked(dcrClient.discoverProtectedResource).mockResolvedValue(null);

      vi.mocked(dcrClient.registerClient).mockResolvedValue({
        client_id: "new-client-id",
        client_secret: "new-client-secret",
        redirect_uris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        grant_types: ["authorization_code"],
        response_types: ["code"],
      });

      vi.mocked(db.oAuthClient.create).mockResolvedValue({
        id: "client-1",
        mcpServerId: mockMcpServerId,
        clientId: "new-client-id",
        clientSecret: null,
        registrationAccessToken: null,
        registrationClientUri: null,
        authorizationServerUrl: "https://auth.example.com",
        authorizationEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        registrationEndpoint: null,
        jwksUri: null,
        revocationEndpoint: null,
        introspectionEndpoint: null,
        protectedResourceUrl: null,
        resourceIndicator: null,
        tokenEndpointAuthMethod: "client_secret_basic",
        grantTypes: [],
        responseTypes: [],
        scopes: [],
        redirectUris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        applicationName: null,
        applicationUri: null,
        logoUri: null,
        contactEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.oAuthSession.create).mockResolvedValue({
        id: "session-1",
        sessionId: "test-session-id",
        userId: mockUserId,
        mcpServerId: mockMcpServerId,
        state: expect.any(String) as string,
        nonce: null,
        codeVerifier: expect.any(String) as string,
        codeChallenge: expect.any(String) as string,
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost:8080/oauth/callback/test-mcp-server",
        requestedScopes: [],
        status: "pending",
        expiresAt: expect.any(Date) as Date,
        errorCode: null,
        errorDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await oauthManager.authenticate(
        mockMcpServerId,
        mockUserId,
        mockMcpServerUrl,
        wwwAuthHeader,
      );

      // Assert
      expect(result.requiresUserInteraction).toBe(true);
      expect(dcrClient.discoverAuthServer).toHaveBeenCalledWith(
        "https://auth.example.com",
      );
    });
  });

  describe("handleCallback", () => {
    const mockCode = "auth-code-123";
    const mockState = "state-123";

    test("認証コードをトークンに交換成功", async () => {
      // Mock setup
      vi.mocked(db.oAuthSession.findFirst).mockResolvedValue({
        id: "session-1",
        sessionId: "test-session-id",
        userId: "test-user",
        mcpServerId: "test-mcp-server",
        state: mockState,
        nonce: null,
        codeVerifier: "code-verifier",
        codeChallenge: "code-challenge",
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost:8080/oauth/callback/test-mcp-server",
        requestedScopes: [],
        status: "pending",
        expiresAt: new Date(Date.now() + 600000),
        errorCode: null,
        errorDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.oAuthClient.findUnique).mockResolvedValue({
        id: "client-1",
        mcpServerId: "test-mcp-server",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        registrationAccessToken: null,
        registrationClientUri: null,
        authorizationServerUrl: "https://auth.example.com",
        authorizationEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        registrationEndpoint: null,
        jwksUri: null,
        revocationEndpoint: null,
        introspectionEndpoint: null,
        protectedResourceUrl: null,
        resourceIndicator: null,
        tokenEndpointAuthMethod: "client_secret_basic",
        grantTypes: [],
        responseTypes: [],
        scopes: [],
        redirectUris: [],
        applicationName: null,
        applicationUri: null,
        logoUri: null,
        contactEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // organizationMemberのモック追加
      vi.mocked(db.organizationMember.findFirst).mockResolvedValue({
        id: "member-1",
        userId: "test-user",
        organizationId: "org-1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.userMcpServerConfig.findFirst).mockResolvedValue({
        id: "config-1",
        organizationId: "org-1",
        mcpServerId: "test-mcp-server",
        name: "Test Config",
        description: "Test Description",
        envVars: "",
        oauthConnection: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock fetch for token exchange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "read write",
          }),
      });

      vi.mocked(tokenManager.saveToken).mockResolvedValue("token-1");

      vi.mocked(db.oAuthSession.update).mockResolvedValue({
        id: "session-1",
        sessionId: "test-session-id",
        userId: "test-user",
        mcpServerId: "test-mcp-server",
        state: mockState,
        nonce: null,
        codeVerifier: "code-verifier",
        codeChallenge: "code-challenge",
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost:8080/oauth/callback/test-mcp-server",
        requestedScopes: [],
        status: "completed",
        expiresAt: new Date(Date.now() + 600000),
        errorCode: null,
        errorDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await oauthManager.handleCallback(mockCode, mockState);

      // Assert
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe("new-access-token");
      expect(result.expiresAt).toBeDefined();

      // Verify token was saved
      expect(tokenManager.saveToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userMcpConfigId: "config-1",
          oauthClientId: "client-1",
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          tokenType: "Bearer",
          scope: "read write",
        }),
      );

      // Verify session was updated
      expect(db.oAuthSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: { status: "completed" },
      });
    });

    test("エラーレスポンスの処理", async () => {
      // Execute
      const result = await oauthManager.handleCallback(
        "",
        mockState,
        "access_denied",
        "User denied access",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.error).toBe("access_denied");
      expect(result.error?.error_description).toBe("User denied access");
    });

    test("セッション期限切れエラー", async () => {
      // Mock setup
      vi.mocked(db.oAuthSession.findFirst).mockResolvedValue({
        id: "session-1",
        sessionId: "test-session-id",
        userId: "test-user",
        mcpServerId: "test-mcp-server",
        state: mockState,
        nonce: null,
        codeVerifier: "code-verifier",
        codeChallenge: "code-challenge",
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost:8080/oauth/callback/test-mcp-server",
        requestedScopes: [],
        status: "pending",
        expiresAt: new Date(Date.now() - 1000), // 期限切れ
        errorCode: null,
        errorDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await oauthManager.handleCallback(mockCode, mockState);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.error).toBe("session_expired");
    });
  });

  describe("refreshToken", () => {
    test("トークンリフレッシュ成功", async () => {
      const mockTokenId = "token-1";

      // Mock setup
      vi.mocked(tokenManager.refreshToken).mockResolvedValue("refreshed-token");

      // Execute
      const result = await oauthManager.refreshToken(mockTokenId);

      // Assert
      expect(result).toBe("refreshed-token");
      expect(tokenManager.refreshToken).toHaveBeenCalledWith(
        mockTokenId,
        expect.objectContaining({
          maxRetries: 3,
          retryDelay: 1000,
        }),
      );
    });
  });

  describe("revokeToken", () => {
    test("トークン無効化成功", async () => {
      const mockTokenId = "token-1";

      // Mock setup
      vi.mocked(tokenManager.revokeToken).mockResolvedValue();

      // Execute
      await oauthManager.revokeToken(mockTokenId);

      // Assert
      expect(tokenManager.revokeToken).toHaveBeenCalledWith(mockTokenId);
    });
  });

  describe("handleWWWAuthenticateChallenge", () => {
    test("Bearer認証チャレンジの処理", async () => {
      const challenge = {
        scheme: "Bearer",
        realm: "example",
        as_uri: "https://auth.example.com",
      };

      // Mock setup
      vi.mocked(db.organizationMember.findFirst).mockResolvedValue(null);
      vi.mocked(db.userMcpServerConfig.findFirst).mockResolvedValue(null);
      vi.mocked(db.oAuthClient.findUnique).mockResolvedValue(null);
      vi.mocked(tokenManager.getValidToken).mockResolvedValue(null);

      vi.mocked(dcrClient.parseWWWAuthenticate).mockReturnValue({
        scheme: "Bearer",
        realm: "example",
        as_uri: "https://auth.example.com",
      });

      vi.mocked(dcrClient.discoverAuthServer).mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        registration_endpoint: "https://auth.example.com/register",
      });

      vi.mocked(dcrClient.discoverProtectedResource).mockResolvedValue(null);

      vi.mocked(dcrClient.registerClient).mockResolvedValue({
        client_id: "new-client-id",
        client_secret: "new-client-secret",
        redirect_uris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        grant_types: ["authorization_code"],
        response_types: ["code"],
      });

      vi.mocked(db.oAuthClient.create).mockResolvedValue({
        id: "client-1",
        mcpServerId: "test-mcp-server",
        clientId: "new-client-id",
        clientSecret: "new-client-secret",
        registrationAccessToken: null,
        registrationClientUri: null,
        authorizationServerUrl: "https://auth.example.com",
        authorizationEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        registrationEndpoint: "https://auth.example.com/register",
        jwksUri: null,
        revocationEndpoint: null,
        introspectionEndpoint: null,
        protectedResourceUrl: null,
        resourceIndicator: null,
        tokenEndpointAuthMethod: "client_secret_basic",
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
        scopes: [],
        redirectUris: ["http://localhost:8080/oauth/callback/test-mcp-server"],
        applicationName: null,
        applicationUri: null,
        logoUri: null,
        contactEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.oAuthSession.create).mockResolvedValue({
        id: "session-1",
        sessionId: "test-session-id",
        userId: "test-user",
        mcpServerId: "test-mcp-server",
        state: expect.any(String) as string,
        nonce: null,
        codeVerifier: expect.any(String) as string,
        codeChallenge: expect.any(String) as string,
        codeChallengeMethod: "S256",
        redirectUri: "http://localhost:8080/oauth/callback/test-mcp-server",
        requestedScopes: [],
        status: "pending",
        expiresAt: expect.any(Date) as Date,
        errorCode: null,
        errorDescription: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const result = await oauthManager.handleWWWAuthenticateChallenge(
        challenge,
        "test-mcp-server",
        "test-user",
        "https://mcp.example.com",
      );

      // Assert
      expect(result.requiresUserInteraction).toBe(true);
      expect(result.authorizationUrl).toContain(
        "https://auth.example.com/authorize",
      );
    });

    test("サポートされていない認証スキーム", async () => {
      const challenge = {
        scheme: "Basic",
        realm: "example",
      };

      // Execute
      const result = await oauthManager.handleWWWAuthenticateChallenge(
        challenge,
        "test-mcp-server",
        "test-user",
        "https://mcp.example.com",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.error).toBe("unsupported_response_type");
      expect(result.error?.error_description).toContain(
        "Unsupported authentication scheme: Basic",
      );
    });
  });
});

describe("createOAuthManager", () => {
  test("OAuthManagerオブジェクトを作成", () => {
    const manager = createOAuthManager({
      callbackBaseUrl: "http://localhost:8080",
      enablePKCE: true,
    });

    expect(manager).toBeDefined();
    expect(manager.authenticate).toBeInstanceOf(Function);
    expect(manager.handleCallback).toBeInstanceOf(Function);
    expect(manager.refreshToken).toBeInstanceOf(Function);
    expect(manager.revokeToken).toBeInstanceOf(Function);
    expect(manager.handleWWWAuthenticateChallenge).toBeInstanceOf(Function);
  });
});
