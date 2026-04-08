import { describe, test, expect } from "vitest";
import type { AuthorizationServer, Client } from "oauth4webapi";
import { generateAuthorizationUrl } from "../oauth.auth-url";

describe("oauth.auth-url", () => {
  const authServer: AuthorizationServer = {
    issuer: "https://www.figma.com",
    authorization_endpoint: "https://www.figma.com/oauth",
    token_endpoint: "https://www.figma.com/api/oauth/token",
  };

  /** generateAuthorizationUrl は client_id のみ使用（Pick<Client, "client_id">） */
  const client: Pick<Client, "client_id"> = {
    client_id: "test-client-id",
  };

  const params = {
    redirectUri: "tumiki://oauth/callback",
    scopes: ["files:read", "file_dev_resources:write"],
    state: "random-state-value",
    codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  };

  test("すべての必須パラメータを含む認可URLを生成する", () => {
    const url = generateAuthorizationUrl(authServer, client, params);

    expect(url.origin).toBe("https://www.figma.com");
    expect(url.pathname).toBe("/oauth");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "tumiki://oauth/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(
      "files:read file_dev_resources:write",
    );
    expect(url.searchParams.get("state")).toBe("random-state-value");
    expect(url.searchParams.get("code_challenge")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  test("authorization_endpointがない場合エラーをスローする", () => {
    const serverWithoutEndpoint: AuthorizationServer = {
      issuer: "https://example.com",
      token_endpoint: "https://example.com/token",
    };

    expect(() =>
      generateAuthorizationUrl(serverWithoutEndpoint, client, params),
    ).toThrow("Authorization endpoint not found");
  });

  test("スコープをスペース区切りで結合する", () => {
    const url = generateAuthorizationUrl(authServer, client, {
      ...params,
      scopes: ["read", "write", "admin"],
    });

    expect(url.searchParams.get("scope")).toBe("read write admin");
  });
});
