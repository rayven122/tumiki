import { describe, test, expect, vi, beforeEach } from "vitest";

// モック設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
  },
}));
vi.mock("../../../shared/utils/logger");
vi.mock("oauth4webapi", () => ({
  dynamicClientRegistrationRequest: vi.fn(),
  processDynamicClientRegistrationResponse: vi.fn(),
}));

import * as oauth from "oauth4webapi";
import { performDCR, MCP_OAUTH_REDIRECT_URI } from "../oauth.dcr";
import { DiscoveryError } from "../oauth.discovery";

describe("oauth.dcr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const metadata: oauth.AuthorizationServer = {
    issuer: "https://www.figma.com",
    authorization_endpoint: "https://www.figma.com/oauth",
    token_endpoint: "https://www.figma.com/api/oauth/token",
    registration_endpoint: "https://www.figma.com/api/oauth/register",
  };

  const mockRegistration: oauth.Client = {
    client_id: "abc123",
    client_secret: "secret_value",
    token_endpoint_auth_method: "client_secret_post",
  };

  test("DCRを正常に実行しクライアント情報を取得する", async () => {
    const responseBody = {
      client_id: "abc123",
      client_secret: "secret_value",
      client_secret_expires_at: 0,
      redirect_uris: [MCP_OAUTH_REDIRECT_URI],
      client_name: "Claude Code",
    };

    vi.mocked(oauth.dynamicClientRegistrationRequest).mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody), { status: 201 }),
    );
    vi.mocked(
      oauth.processDynamicClientRegistrationResponse,
    ).mockResolvedValueOnce(mockRegistration);

    const result = await performDCR(metadata);

    expect(result.metadata).toStrictEqual(metadata);
    expect(result.registration).toStrictEqual(mockRegistration);

    // クライアントメタデータの検証
    expect(oauth.dynamicClientRegistrationRequest).toHaveBeenCalledWith(
      metadata,
      expect.objectContaining({
        client_name: "Claude Code",
        redirect_uris: [MCP_OAUTH_REDIRECT_URI],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_post",
      }),
    );
  });

  test("registration_endpointがない場合DCR_NOT_SUPPORTEDエラーをスローする", async () => {
    const metadataWithoutDCR: oauth.AuthorizationServer = {
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/authorize",
      token_endpoint: "https://example.com/token",
    };

    await expect(performDCR(metadataWithoutDCR)).rejects.toThrow(
      DiscoveryError,
    );
    await expect(performDCR(metadataWithoutDCR)).rejects.toThrow(
      "does not support Dynamic Client Registration",
    );
  });

  test("client_secret_expires_atが欠落している場合0を補完する", async () => {
    // client_secret_expires_at なしのレスポンス
    const responseBody = {
      client_id: "abc123",
      client_secret: "secret_value",
      redirect_uris: [MCP_OAUTH_REDIRECT_URI],
    };

    vi.mocked(oauth.dynamicClientRegistrationRequest).mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody), { status: 201 }),
    );
    vi.mocked(
      oauth.processDynamicClientRegistrationResponse,
    ).mockResolvedValueOnce(mockRegistration);

    await performDCR(metadata);

    // processDynamicClientRegistrationResponseに渡されるResponseを検証
    const call = vi.mocked(oauth.processDynamicClientRegistrationResponse).mock
      .calls[0];
    const passedResponse = call?.[0] as Response;
    const body = JSON.parse(await passedResponse.text()) as Record<
      string,
      unknown
    >;
    expect(body.client_secret_expires_at).toBe(0);
  });

  test("ステータスコード200を201に変換する", async () => {
    const responseBody = {
      client_id: "abc123",
      client_secret: "secret_value",
      client_secret_expires_at: 0,
    };

    // 一部サーバーは200を返す
    vi.mocked(oauth.dynamicClientRegistrationRequest).mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    );
    vi.mocked(
      oauth.processDynamicClientRegistrationResponse,
    ).mockResolvedValueOnce(mockRegistration);

    await performDCR(metadata);

    // 201に変換されていることを検証
    const call = vi.mocked(oauth.processDynamicClientRegistrationResponse).mock
      .calls[0];
    const passedResponse = call?.[0] as Response;
    expect(passedResponse.status).toBe(201);
  });
});
