/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createStateToken,
  verifyStateToken,
  type OAuthStatePayload,
  OAuthStatePayloadSchema,
} from "./state-token";

// 環境変数をモック
const mockSecret = "test-secret-key-for-jwt-signing-must-be-secure-enough";

beforeEach(() => {
  vi.resetAllMocks();
  // テスト用の環境変数を設定（vi.stubEnvを使用）
  vi.stubEnv("NEXTAUTH_SECRET", mockSecret);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// テスト用のベースペイロード（JWTクレームを除外した形式）
const createMockPayload = (): OAuthStatePayload => ({
  state: "test-state-123",
  codeVerifier: "test-code-verifier-abc",
  codeChallenge: "test-code-challenge-xyz",
  nonce: "test-nonce-456",
  mcpServerId: "mcp-server-789",
  userId: "user-123",
  organizationId: "org-456",
  redirectUri: "https://example.com/callback",
  requestedScopes: ["read", "write"],
  expiresAt: Date.now() + 10 * 60 * 1000, // 10分後
});

describe("OAuthStatePayloadSchema", () => {
  test("有効なペイロードを正しく検証する", () => {
    const payload = createMockPayload();
    const result = OAuthStatePayloadSchema.parse(payload);
    expect(result).toStrictEqual(payload);
  });

  test("JWTクレーム（iat, exp）を含むペイロードを正しく検証する", () => {
    const payload = {
      ...createMockPayload(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
    };
    const result = OAuthStatePayloadSchema.parse(payload);
    expect(result).toStrictEqual(payload);
  });

  test("必須フィールドが不足している場合はエラーを投げる", () => {
    const invalidPayload = {
      state: "test-state",
      // その他の必須フィールドが不足
    };
    expect(() => OAuthStatePayloadSchema.parse(invalidPayload)).toThrow();
  });

  test("フィールドの型が間違っている場合はエラーを投げる", () => {
    const invalidPayload = {
      ...createMockPayload(),
      expiresAt: "invalid-number", // 数値でない
    };
    expect(() => OAuthStatePayloadSchema.parse(invalidPayload)).toThrow();
  });
});

describe("createStateToken", () => {
  test("有効なペイロードから正常にJWTトークンを生成する", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);

    // JWTトークンの形式（3つの部分をドットで区切った文字列）であることを確認
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("生成されたトークンが復号化可能であることを確認する", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);
    const verified = await verifyStateToken(token);

    // JWTクレーム（iat, exp）が追加されることを考慮して、元のペイロードが含まれていることを確認
    expect(verified.state).toBe(payload.state);
    expect(verified.codeVerifier).toBe(payload.codeVerifier);
    expect(verified.userId).toBe(payload.userId);
    expect(verified.organizationId).toBe(payload.organizationId);
  });

  test("環境変数が設定されていない場合はエラーを投げる", async () => {
    // 一時的に環境変数をクリア
    vi.unstubAllEnvs();

    const payload = createMockPayload();
    await expect(createStateToken(payload)).rejects.toThrow(
      "NEXTAUTH_SECRET environment variable is required",
    );

    // 元に戻す
    vi.stubEnv("NEXTAUTH_SECRET", mockSecret);
  });

  test("無効なペイロードでエラーを投げる", async () => {
    const invalidPayload = {
      state: "test",
      // 必須フィールドが不足
    } as unknown as OAuthStatePayload;

    await expect(createStateToken(invalidPayload)).rejects.toThrow();
  });
});

describe("verifyStateToken", () => {
  test("有効なトークンを正常に検証・復号化する", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);
    const verified = await verifyStateToken(token);

    // 元のペイロードの内容が保持されていることを確認
    expect(verified.state).toBe(payload.state);
    expect(verified.codeVerifier).toBe(payload.codeVerifier);
    expect(verified.codeChallenge).toBe(payload.codeChallenge);
    expect(verified.nonce).toBe(payload.nonce);
    expect(verified.mcpServerId).toBe(payload.mcpServerId);
    expect(verified.userId).toBe(payload.userId);
    expect(verified.organizationId).toBe(payload.organizationId);
    expect(verified.redirectUri).toBe(payload.redirectUri);
    expect(verified.requestedScopes).toStrictEqual(payload.requestedScopes);

    // JWTクレームが追加されていることを確認
    expect(verified.iat).toBeDefined();
    expect(verified.exp).toBeDefined();
  });

  test("改ざんされたトークンを検出してエラーを投げる", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);

    // トークンを改ざん
    const tamperedToken = token + "tampered";

    // joseライブラリは改ざんを検出して"signature verification failed"エラーを投げる
    await expect(verifyStateToken(tamperedToken)).rejects.toThrow();
  });

  test("署名部分が改ざんされたトークンを検出する", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);
    const tokenParts = token.split(".");

    // 署名部分を改ざん（Base64Urlデコードして1バイト変更してから再エンコード）
    const signatureBuf = Buffer.from(tokenParts[2]!, "base64url");
    const tamperedBuf = Buffer.alloc(signatureBuf.length);
    signatureBuf.copy(tamperedBuf);
    // 最初のバイトを反転
    tamperedBuf[0] = (tamperedBuf[0]! + 1) % 256;
    const tamperedSignature = tamperedBuf.toString("base64url");
    const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.${tamperedSignature}`;

    // joseライブラリは署名検証失敗時に"signature verification failed"エラーを投げる
    await expect(verifyStateToken(tamperedToken)).rejects.toThrow();
  });

  test("ペイロード部分が改ざんされたトークンを検出する", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);
    const tokenParts = token.split(".");

    // Base64でエンコードされた悪意のあるペイロード
    const maliciousPayload = Buffer.from(
      JSON.stringify({
        userId: "hacker-user-id",
        organizationId: "hacker-org-id",
      }),
    ).toString("base64url");

    const tamperedToken = `${tokenParts[0]}.${maliciousPayload}.${tokenParts[2]}`;

    // joseライブラリはペイロード改ざんによる署名検証失敗時にエラーを投げる
    await expect(verifyStateToken(tamperedToken)).rejects.toThrow();
  });

  test("期限切れトークンを検出してエラーを投げる", async () => {
    // 過去の期限で新しいトークンを作成
    const expiredPayload = {
      ...createMockPayload(),
      expiresAt: Date.now() - 1000, // 1秒前に期限切れ
    };

    const token = await createStateToken(expiredPayload);

    // JWTライブラリは期限切れトークンを自動的に拒否する（"exp" claim timestamp check failed）
    await expect(verifyStateToken(token)).rejects.toThrow();
  });

  test("不正な形式のトークンでエラーを投げる", async () => {
    const invalidToken = "not.a.valid.jwt.token";

    // joseライブラリは不正な形式のトークンに対して"Invalid Compact JWS"エラーを投げる
    await expect(verifyStateToken(invalidToken)).rejects.toThrow();
  });

  test("空のトークンでエラーを投げる", async () => {
    // joseライブラリは空のトークンに対して"Invalid Compact JWS"エラーを投げる
    await expect(verifyStateToken("")).rejects.toThrow();
  });

  test("異なるシークレットキーで署名されたトークンを拒否する", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);

    // 異なるシークレットキーを設定
    vi.stubEnv("NEXTAUTH_SECRET", "different-secret-key");

    // joseライブラリは署名検証失敗時にエラーを投げる
    await expect(verifyStateToken(token)).rejects.toThrow();

    // 元に戻す
    vi.unstubAllEnvs();
    vi.stubEnv("NEXTAUTH_SECRET", mockSecret);
  });

  test("環境変数が設定されていない場合はエラーを投げる", async () => {
    const payload = createMockPayload();
    const token = await createStateToken(payload);

    // 一時的に環境変数をクリア
    vi.unstubAllEnvs();

    await expect(verifyStateToken(token)).rejects.toThrow(
      "NEXTAUTH_SECRET environment variable is required",
    );

    // 元に戻す
    vi.stubEnv("NEXTAUTH_SECRET", mockSecret);
  });

  test("古いトークンフォーマットを適切に処理する", async () => {
    // JWTクレーム以外のフィールドが追加されたペイロードでも正常に動作することを確認
    const payloadWithExtra = {
      ...createMockPayload(),
      customField: "custom-value", // カスタムフィールド
    };

    // Zodスキーマによりカスタムフィールドは除外されるが、エラーにはならない
    const token = await createStateToken(payloadWithExtra);
    const verified = await verifyStateToken(token);

    expect(verified.state).toBe(payloadWithExtra.state);
    // カスタムフィールドは含まれない
    expect("customField" in verified).toBe(false);
  });
});

describe("セキュリティテスト", () => {
  test("異なるペイロードから同じトークンが生成されないことを確認", async () => {
    const payload1 = createMockPayload();
    const payload2 = {
      ...payload1,
      userId: "different-user-id",
    };

    const token1 = await createStateToken(payload1);
    const token2 = await createStateToken(payload2);

    expect(token1).not.toBe(token2);
  });

  test("時間による署名の一意性を確認", async () => {
    const payload = createMockPayload();

    const token1 = await createStateToken(payload);
    // JWTのiatクレームは秒単位なので、1秒以上待つ
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const token2 = await createStateToken(payload);

    // 同じペイロードでも時間が異なるため、異なるトークンが生成される
    expect(token1).not.toBe(token2);
  });

  test("大量のデータでのパフォーマンステスト", async () => {
    const payload = {
      ...createMockPayload(),
      requestedScopes: Array.from({ length: 100 }, (_, i) => `scope-${i}`),
      redirectUri: "https://example.com/callback".repeat(10),
    };

    const startTime = Date.now();
    const token = await createStateToken(payload);
    const verified = await verifyStateToken(token);
    const endTime = Date.now();

    // パフォーマンスチェック（100ms以内で完了することを期待）
    expect(endTime - startTime).toBeLessThan(100);
    expect(verified.requestedScopes).toHaveLength(100);
  });

  test("極端に長い期限での動作確認", async () => {
    const payload = {
      ...createMockPayload(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1年後
    };

    const token = await createStateToken(payload);
    const verified = await verifyStateToken(token);

    expect(verified.expiresAt).toBe(payload.expiresAt);
  });
});
