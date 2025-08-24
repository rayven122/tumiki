import { describe, expect, test } from "vitest";

import {
  buildAuthorizationUrl,
  buildRedirectUri,
  buildTokenRequestBody,
  calculateRetryDelay,
  calculateTokenExpiry,
  createBasicAuthHeader,
  createOAuthError,
  extractAuthorizationCode,
  formatScopes,
  generateNonce,
  generatePKCE,
  generateSessionId,
  generateState,
  hasRequiredScopes,
  isSessionValid,
  OAuthErrorCodes,
  parseErrorResponse,
  parseScopes,
  validateAuthServerMetadata,
  validateTokenResponse,
} from "../utils.js";

describe("generatePKCE", () => {
  test("PKCE値を生成する", () => {
    const pkce = generatePKCE();

    expect(pkce.codeVerifier).toBeDefined();
    expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);
    expect(pkce.codeChallenge).toBeDefined();
    expect(pkce.codeChallengeMethod).toStrictEqual("S256");
  });

  test("コードベリファイアがBase64URL形式である", () => {
    const pkce = generatePKCE();
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;

    expect(pkce.codeVerifier).toMatch(base64UrlRegex);
    expect(pkce.codeChallenge).toMatch(base64UrlRegex);
  });
});

describe("generateState", () => {
  test("ランダムなstate値を生成する", () => {
    const state1 = generateState();
    const state2 = generateState();

    expect(state1).toBeDefined();
    expect(state2).toBeDefined();
    expect(state1).not.toStrictEqual(state2);
  });
});

describe("generateNonce", () => {
  test("ランダムなnonce値を生成する", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toStrictEqual(nonce2);
  });
});

describe("generateSessionId", () => {
  test("ランダムなセッションID値を生成する", () => {
    const sessionId1 = generateSessionId();
    const sessionId2 = generateSessionId();

    expect(sessionId1).toBeDefined();
    expect(sessionId2).toBeDefined();
    expect(sessionId1).not.toStrictEqual(sessionId2);
  });
});

describe("buildRedirectUri", () => {
  test("リダイレクトURIを構築する", () => {
    const baseUrl = "https://app.example.com";
    const mcpServerId = "mcp-server-1";

    const redirectUri = buildRedirectUri(baseUrl, mcpServerId);

    expect(redirectUri).toStrictEqual(
      "https://app.example.com/oauth/callback/mcp-server-1",
    );
  });

  test("ベースURLにスラッシュが含まれている場合でも正しく処理する", () => {
    const baseUrl = "https://app.example.com/";
    const mcpServerId = "mcp-server-1";

    const redirectUri = buildRedirectUri(baseUrl, mcpServerId);

    expect(redirectUri).toStrictEqual(
      "https://app.example.com/oauth/callback/mcp-server-1",
    );
  });
});

describe("buildAuthorizationUrl", () => {
  test("認証URLを構築する", () => {
    const authorizationUrl = buildAuthorizationUrl(
      "https://auth.example.com/authorize",
      {
        client_id: "client123",
        redirect_uri: "https://app.example.com/callback",
        response_type: "code",
        scope: "read write",
        state: "state123",
        code_challenge: "challenge123",
        code_challenge_method: "S256",
        nonce: "nonce123",
      },
    );

    expect(authorizationUrl).toContain("https://auth.example.com/authorize");
    expect(authorizationUrl).toContain("client_id=client123");
    expect(authorizationUrl).toContain(
      "redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback",
    );
    expect(authorizationUrl).toContain("scope=read+write");
    expect(authorizationUrl).toContain("state=state123");
    expect(authorizationUrl).toContain("code_challenge=challenge123");
    expect(authorizationUrl).toContain("code_challenge_method=S256");
    expect(authorizationUrl).toContain("nonce=nonce123");
  });

  test("ノンスなしでも正しく構築する", () => {
    const authorizationUrl = buildAuthorizationUrl(
      "https://auth.example.com/authorize",
      {
        client_id: "client123",
        redirect_uri: "https://app.example.com/callback",
        response_type: "code",
        scope: "read write",
        state: "state123",
        code_challenge: "challenge123",
        code_challenge_method: "S256",
      },
    );

    expect(authorizationUrl).not.toContain("nonce");
  });
});

describe("buildTokenRequestBody", () => {
  test("トークンリクエストボディを構築する", () => {
    const body = buildTokenRequestBody({
      grant_type: "authorization_code",
      code: "code123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "client123",
      code_verifier: "verifier123",
    });

    const params = new URLSearchParams(body);

    expect(params.get("grant_type")).toStrictEqual("authorization_code");
    expect(params.get("code")).toStrictEqual("code123");
    expect(params.get("redirect_uri")).toStrictEqual(
      "https://app.example.com/callback",
    );
    expect(params.get("client_id")).toStrictEqual("client123");
    expect(params.get("code_verifier")).toStrictEqual("verifier123");
  });
});

describe("createBasicAuthHeader", () => {
  test("Basic認証ヘッダーを作成する", () => {
    const header = createBasicAuthHeader("client123", "secret456");

    const expectedCredentials = Buffer.from("client123:secret456").toString(
      "base64",
    );
    expect(header).toStrictEqual(`Basic ${expectedCredentials}`);
  });

  test("シークレットが空の場合でも正しく処理する", () => {
    const header = createBasicAuthHeader("client123", "");

    const expectedCredentials = Buffer.from("client123:").toString("base64");
    expect(header).toStrictEqual(`Basic ${expectedCredentials}`);
  });
});

describe("calculateTokenExpiry", () => {
  test("現在時刻からの有効期限を計算する", () => {
    const expiresIn = 3600; // 1 hour
    const expiry = calculateTokenExpiry(expiresIn);

    const now = new Date();
    const expectedExpiry = new Date(now.getTime() + expiresIn * 1000);

    // Allow 1 second difference for execution time
    expect(expiry).toBeDefined();
    if (expiry) {
      expect(
        Math.abs(expiry.getTime() - expectedExpiry.getTime()),
      ).toBeLessThan(1000);
    }
  });

  test("expiresInが未定義の場合undefinedを返す", () => {
    const expiry = calculateTokenExpiry();

    expect(expiry).toBeUndefined();
  });
});

describe("parseScopes", () => {
  test("スペース区切りのスコープをパースする", () => {
    const scopes = parseScopes("read write delete");

    expect(scopes).toStrictEqual(["read", "write", "delete"]);
  });

  test("空文字列の場合は空配列を返す", () => {
    const scopes = parseScopes("");

    expect(scopes).toStrictEqual([]);
  });

  test("未定義の場合は空配列を返す", () => {
    const scopes = parseScopes(undefined);

    expect(scopes).toStrictEqual([]);
  });
});

describe("formatScopes", () => {
  test("配列をスペース区切り文字列に変換する", () => {
    const formatted = formatScopes(["read", "write", "delete"]);

    expect(formatted).toStrictEqual("read write delete");
  });

  test("空配列の場合は空文字列を返す", () => {
    const formatted = formatScopes([]);

    expect(formatted).toStrictEqual("");
  });

  test("重複を除去する", () => {
    const formatted = formatScopes(["read", "write", "read", "delete"]);

    expect(formatted).toStrictEqual("read write delete");
  });
});

describe("calculateRetryDelay", () => {
  test("リトライ遅延を計算する（ジッター付き）", () => {
    // attempt 0 -> 1 * 2^(0-1) = 0.5 + jitter
    const delay0 = calculateRetryDelay(0);
    expect(delay0).toBeGreaterThanOrEqual(500);
    expect(delay0).toBeLessThanOrEqual(550);

    // attempt 1 -> 1000 * 2^0 = 1000 + jitter
    const delay1 = calculateRetryDelay(1);
    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay1).toBeLessThanOrEqual(1100);

    // attempt 2 -> 1000 * 2^1 = 2000 + jitter
    const delay2 = calculateRetryDelay(2);
    expect(delay2).toBeGreaterThanOrEqual(2000);
    expect(delay2).toBeLessThanOrEqual(2200);
  });

  test("最大遅延を制限する", () => {
    expect(calculateRetryDelay(10)).toBeLessThanOrEqual(30000);
    expect(calculateRetryDelay(20)).toBeLessThanOrEqual(30000);
  });
});

describe("parseErrorResponse", () => {
  test("OAuthエラーレスポンスをパースする", () => {
    const errorText = JSON.stringify({
      error: "invalid_grant",
      error_description: "The provided authorization grant is invalid",
    });

    const error = parseErrorResponse(errorText);

    expect(error.error).toStrictEqual("invalid_grant");
    expect(error.error_description).toStrictEqual(
      "The provided authorization grant is invalid",
    );
  });

  test("無効なJSONの場合はデフォルトエラーを返す", () => {
    const error = parseErrorResponse("Not JSON");

    expect(error.error).toStrictEqual("server_error");
    expect(error.error_description).toStrictEqual("Not JSON");
  });

  test("空のレスポンスの場合", () => {
    const error = parseErrorResponse("");

    expect(error.error).toStrictEqual("server_error");
    expect(error.error_description).toStrictEqual("Unknown error occurred");
  });
});

describe("extractAuthorizationCode", () => {
  test("URLから認証コードを抽出する", () => {
    const url = "https://app.example.com/callback?code=auth123&state=state456";
    const result = extractAuthorizationCode(url);

    expect(result.code).toStrictEqual("auth123");
    expect(result.state).toStrictEqual("state456");
    expect(result.error).toBeUndefined();
  });

  test("エラーパラメータを抽出する", () => {
    const url =
      "https://app.example.com/callback?error=access_denied&error_description=User%20denied%20access";
    const result = extractAuthorizationCode(url);

    expect(result.code).toBeUndefined();
    expect(result.state).toBeUndefined();
    expect(result.error?.error).toStrictEqual("access_denied");
    expect(result.error?.error_description).toStrictEqual("User denied access");
  });

  test("パラメータがない場合はエラーを返す", () => {
    const url = "https://app.example.com/callback";
    const result = extractAuthorizationCode(url);

    expect(result.code).toBeUndefined();
    expect(result.state).toBeUndefined();
    expect(result.error?.error).toStrictEqual("invalid_request");
    expect(result.error?.error_description).toStrictEqual(
      "Authorization code not found in callback URL",
    );
  });
});

describe("isSessionValid", () => {
  test("有効なセッションを判定する", () => {
    const futureDate = new Date(Date.now() + 10000);
    const session = { expiresAt: futureDate, status: "pending" };

    expect(isSessionValid(session)).toStrictEqual(true);
  });

  test("期限切れセッションを判定する", () => {
    const pastDate = new Date(Date.now() - 10000);
    const session = { expiresAt: pastDate, status: "pending" };

    expect(isSessionValid(session)).toStrictEqual(false);
  });

  test("完了済みのセッションは無効", () => {
    const futureDate = new Date(Date.now() + 10000);
    const session = { expiresAt: futureDate, status: "completed" };

    expect(isSessionValid(session)).toStrictEqual(false);
  });
});

describe("validateTokenResponse", () => {
  test("有効なトークンレスポンスを検証する", () => {
    const response = {
      access_token: "token123",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "refresh123",
      scope: "read write",
    };

    expect(validateTokenResponse(response)).toStrictEqual(true);
  });

  test("access_tokenが欠けている場合falseを返す", () => {
    const response = {
      token_type: "Bearer",
      expires_in: 3600,
    };

    expect(validateTokenResponse(response)).toStrictEqual(false);
  });

  test("token_typeが欠けている場合falseを返す", () => {
    const response = {
      access_token: "token123",
      expires_in: 3600,
    };

    expect(validateTokenResponse(response)).toStrictEqual(false);
  });
});

describe("validateAuthServerMetadata", () => {
  test("有効なメタデータを検証する", () => {
    const metadata = {
      issuer: "https://auth.example.com",
      authorization_endpoint: "https://auth.example.com/authorize",
      token_endpoint: "https://auth.example.com/token",
      jwks_uri: "https://auth.example.com/.well-known/jwks.json",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
    };

    expect(validateAuthServerMetadata(metadata)).toStrictEqual(true);
  });

  test("必須フィールドが欠けている場合falseを返す", () => {
    const metadata = {
      issuer: "https://auth.example.com",
      authorization_endpoint: "https://auth.example.com/authorize",
    };

    expect(validateAuthServerMetadata(metadata)).toStrictEqual(false);
  });
});

describe("hasRequiredScopes", () => {
  test("必要なスコープがすべて含まれている場合", () => {
    const grantedScopes = ["read", "write", "delete"];
    const requiredScopes = ["read", "write"];

    expect(hasRequiredScopes(grantedScopes, requiredScopes)).toStrictEqual(
      true,
    );
  });

  test("必要なスコープが不足している場合", () => {
    const grantedScopes = ["read"];
    const requiredScopes = ["read", "write"];

    expect(hasRequiredScopes(grantedScopes, requiredScopes)).toStrictEqual(
      false,
    );
  });

  test("必要なスコープが空の場合", () => {
    const grantedScopes = ["read", "write"];
    const requiredScopes: string[] = [];

    expect(hasRequiredScopes(grantedScopes, requiredScopes)).toStrictEqual(
      true,
    );
  });
});

describe("createOAuthError", () => {
  test("OAuthエラーオブジェクトを作成する", () => {
    const error = createOAuthError(
      OAuthErrorCodes.INVALID_REQUEST,
      "Invalid parameters",
    );

    expect(error.error).toStrictEqual(OAuthErrorCodes.INVALID_REQUEST);
    expect(error.error_description).toStrictEqual("Invalid parameters");
  });

  test("エラーURIを含むエラーを作成する", () => {
    const error = createOAuthError(
      OAuthErrorCodes.UNAUTHORIZED_CLIENT,
      "Client not authorized",
      "https://docs.example.com/errors#unauthorized",
    );

    expect(error.error).toStrictEqual(OAuthErrorCodes.UNAUTHORIZED_CLIENT);
    expect(error.error_description).toStrictEqual("Client not authorized");
    expect(error.error_uri).toStrictEqual(
      "https://docs.example.com/errors#unauthorized",
    );
  });
});
