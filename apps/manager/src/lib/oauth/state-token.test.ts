// @vitest-environment node

import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createStateToken,
  verifyStateToken,
  type OAuthStatePayload,
} from "./state-token";

// テスト全体で使用する環境変数を設定
beforeAll(() => {
  vi.stubEnv("OAUTH_STATE_SECRET", "test-secret-key-min-32-chars-long-12345");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("createStateToken", () => {
  // iat と exp は JWT クレームとして自動追加されるため、初期ペイロードには含めない
  const mockPayload: Omit<OAuthStatePayload, "iat" | "exp"> = {
    state: "test-state",
    codeVerifier: "test-verifier",
    codeChallenge: "test-challenge",
    nonce: "test-nonce",
    mcpServerId: "mcp-server-123",
    userId: "user-123",
    organizationId: "org-123",
    redirectUri: "https://example.com/callback",
    requestedScopes: ["read", "write"],
    expiresAt: Date.now() + 600000, // 10分後
  };

  test("正常なペイロードでトークンを生成できる", async () => {
    const token = await createStateToken(mockPayload);

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT形式（header.payload.signature）
  });

  test("環境変数が設定されていない場合、エラーが投げられる", async () => {
    vi.unstubAllEnvs();

    await expect(createStateToken(mockPayload)).rejects.toThrow(
      "OAUTH_STATE_SECRET or NEXTAUTH_SECRET environment variable is required",
    );

    // テスト後に環境変数を復元
    vi.stubEnv("OAUTH_STATE_SECRET", "test-secret-key-min-32-chars-long-12345");
  });

  test("NEXTAUTH_SECRETがフォールバックとして使用される", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXTAUTH_SECRET", "nextauth-secret-key-min-32-chars-long-123");

    const token = await createStateToken(mockPayload);

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    // テスト後に環境変数を復元
    vi.unstubAllEnvs();
    vi.stubEnv("OAUTH_STATE_SECRET", "test-secret-key-min-32-chars-long-12345");
  });

  test("不正なペイロード（必須フィールド欠如）でエラーが投げられる", async () => {
    const invalidPayload = {
      state: "test-state",
      // codeVerifierが欠如
      codeChallenge: "test-challenge",
      nonce: "test-nonce",
    } as unknown as Omit<OAuthStatePayload, "iat" | "exp">;

    await expect(createStateToken(invalidPayload)).rejects.toThrow();
  });
});

describe("verifyStateToken", () => {
  // iat と exp は JWT クレームとして自動追加されるため、初期ペイロードには含めない
  const mockPayload: Omit<OAuthStatePayload, "iat" | "exp"> = {
    state: "test-state",
    codeVerifier: "test-verifier",
    codeChallenge: "test-challenge",
    nonce: "test-nonce",
    mcpServerId: "mcp-server-123",
    userId: "user-123",
    organizationId: "org-123",
    redirectUri: "https://example.com/callback",
    requestedScopes: ["read", "write"],
    expiresAt: Date.now() + 600000,
  };

  test("正常なトークンを検証・復号化できる", async () => {
    const token = await createStateToken(mockPayload);
    const verified = await verifyStateToken(token);

    expect(verified.state).toBe(mockPayload.state);
    expect(verified.codeVerifier).toBe(mockPayload.codeVerifier);
    expect(verified.codeChallenge).toBe(mockPayload.codeChallenge);
    expect(verified.nonce).toBe(mockPayload.nonce);
    expect(verified.mcpServerId).toBe(mockPayload.mcpServerId);
    expect(verified.userId).toBe(mockPayload.userId);
    expect(verified.organizationId).toBe(mockPayload.organizationId);
    expect(verified.redirectUri).toBe(mockPayload.redirectUri);
    expect(verified.requestedScopes).toStrictEqual(mockPayload.requestedScopes);
  });

  test("改ざんされたトークンは検証に失敗する", async () => {
    const token = await createStateToken(mockPayload);
    const tamperedToken = token.slice(0, -10) + "tampered123";

    await expect(verifyStateToken(tamperedToken)).rejects.toThrow();
  });

  test("異なるシークレットキーで署名されたトークンは検証に失敗する", async () => {
    const token = await createStateToken(mockPayload);

    // シークレットキーを一時的に変更
    vi.unstubAllEnvs();
    vi.stubEnv("OAUTH_STATE_SECRET", "different-secret-key-min-32-chars-456");

    await expect(verifyStateToken(token)).rejects.toThrow();

    // テスト後に環境変数を復元
    vi.unstubAllEnvs();
    vi.stubEnv("OAUTH_STATE_SECRET", "test-secret-key-min-32-chars-long-12345");
  });

  test("期限切れトークンは検証に失敗する", async () => {
    const expiredPayload: Omit<OAuthStatePayload, "iat" | "exp"> = {
      ...mockPayload,
      expiresAt: Date.now() - 1000, // 1秒前（過去）
    };

    const token = await createStateToken(expiredPayload);

    // JWTの検証は即座に失敗するため、少し待つ必要はない
    await expect(verifyStateToken(token)).rejects.toThrow();
  });

  test("不正な形式のトークンは検証に失敗する", async () => {
    const invalidToken = "not.a.valid.jwt.token";

    await expect(verifyStateToken(invalidToken)).rejects.toThrow();
  });

  test("空文字列のトークンは検証に失敗する", async () => {
    await expect(verifyStateToken("")).rejects.toThrow();
  });

  test("JWTクレーム（iat, exp）が含まれていても検証できる", async () => {
    const token = await createStateToken(mockPayload);
    const verified = await verifyStateToken(token);

    // JWTクレームが追加されていることを確認
    expect(verified.iat).toBeDefined();
    expect(verified.exp).toBeDefined();
    expect(typeof verified.iat).toBe("number");
    expect(typeof verified.exp).toBe("number");
  });

  test("環境変数が設定されていない場合、エラーが投げられる", async () => {
    const token = await createStateToken(mockPayload);

    vi.unstubAllEnvs();

    await expect(verifyStateToken(token)).rejects.toThrow(
      "OAUTH_STATE_SECRET or NEXTAUTH_SECRET environment variable is required",
    );

    // テスト後に環境変数を復元
    vi.stubEnv("OAUTH_STATE_SECRET", "test-secret-key-min-32-chars-long-12345");
  });
});
