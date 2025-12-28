/**
 * URLユーティリティ関数のテスト
 * @vitest-environment node
 *
 * node環境でテストを実行することで、window が undefined になり、
 * サーバーサイドのロジック（環境変数ベース）をテストできる
 */
import { beforeEach, afterEach, describe, test, expect } from "vitest";
import { getOAuthRedirectUri, getAppBaseUrl, generateInviteUrl } from "./url";

// 元の環境変数を保存
const originalNextAuthUrl = process.env.NEXTAUTH_URL;
const originalVercelUrl = process.env.VERCEL_URL;

describe("getAppBaseUrl", () => {
  beforeEach(() => {
    // 環境変数をクリアして各テストを独立させる
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    // 元の環境変数を復元
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
    process.env.VERCEL_URL = originalVercelUrl;
  });

  test("NEXTAUTH_URLが設定されている場合はそれを返す", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com";

    const result = getAppBaseUrl();
    expect(result).toBe("https://app.example.com");
  });

  test("NEXTAUTH_URLの末尾スラッシュを削除する", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com/";

    const result = getAppBaseUrl();
    expect(result).toBe("https://app.example.com");
  });

  test("Vercel環境（VERCEL_URL）の場合はhttps://を追加", () => {
    process.env.VERCEL_URL = "tumiki-abc123.vercel.app";

    const result = getAppBaseUrl();
    expect(result).toBe("https://tumiki-abc123.vercel.app");
  });

  test("デフォルト値（ローカル開発環境）", () => {
    const result = getAppBaseUrl();
    expect(result).toBe("http://localhost:3000");
  });

  test("優先順位: NEXTAUTH_URL > VERCEL_URL", () => {
    process.env.NEXTAUTH_URL = "https://nextauth.com";
    process.env.VERCEL_URL = "vercel-url.vercel.app";

    const result = getAppBaseUrl();
    expect(result).toBe("https://nextauth.com");
  });
});

describe("getOAuthRedirectUri", () => {
  beforeEach(() => {
    // 環境変数をクリアして各テストを独立させる
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    // 元の環境変数を復元
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
    process.env.VERCEL_URL = originalVercelUrl;
  });

  test("NEXTAUTH_URLが設定されている場合はそれをベースに構築", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com";

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://app.example.com/api/oauth/callback");
  });

  test("Vercel環境（VERCEL_URL）の場合はhttps://を追加して構築", () => {
    process.env.VERCEL_URL = "tumiki-abc123.vercel.app";

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://tumiki-abc123.vercel.app/api/oauth/callback");
  });

  test("Vercel Preview環境での動的URL生成", () => {
    process.env.VERCEL_URL = "tumiki-jeq8r4h8i-rayven-38d708d3.vercel.app";

    const result = getOAuthRedirectUri();
    expect(result).toBe(
      "https://tumiki-jeq8r4h8i-rayven-38d708d3.vercel.app/api/oauth/callback",
    );
  });

  test("デフォルト値（ローカル開発環境）", () => {
    const result = getOAuthRedirectUri();
    expect(result).toBe("http://localhost:3000/api/oauth/callback");
  });

  test("優先順位: NEXTAUTH_URL > VERCEL_URL", () => {
    process.env.NEXTAUTH_URL = "https://nextauth.com";
    process.env.VERCEL_URL = "vercel-url.vercel.app";

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://nextauth.com/api/oauth/callback");
  });

  test("Vercel本番環境でカスタムドメイン使用時", () => {
    process.env.NEXTAUTH_URL = "https://manager.tumiki.cloud";

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://manager.tumiki.cloud/api/oauth/callback");
  });

  test("ローカル開発環境でのデフォルト動作", () => {
    const result = getOAuthRedirectUri();
    expect(result).toBe("http://localhost:3000/api/oauth/callback");
  });
});

describe("generateInviteUrl", () => {
  beforeEach(() => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
    process.env.VERCEL_URL = originalVercelUrl;
  });

  test("招待トークンから招待URLを生成する", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com";

    const result = generateInviteUrl("test-token-123");
    expect(result).toBe("https://app.example.com/invite/test-token-123");
  });

  test("デフォルト環境での招待URL生成", () => {
    const result = generateInviteUrl("abc123");
    expect(result).toBe("http://localhost:3000/invite/abc123");
  });
});
