/**
 * OAuth ユーティリティ関数のテスト
 */
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";
import { getOAuthRedirectUri } from "./utils";

describe("getOAuthRedirectUri", () => {
  beforeEach(() => {
    // 環境変数をクリーンな状態に
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("NEXTAUTH_URLが設定されている場合はそれをベースに構築", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://app.example.com/api/oauth/callback");
  });

  test("Vercel環境（VERCEL_URL）の場合はhttps://を追加して構築", () => {
    vi.stubEnv("VERCEL_URL", "tumiki-abc123.vercel.app");

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://tumiki-abc123.vercel.app/api/oauth/callback");
  });

  test("Vercel Preview環境での動的URL生成", () => {
    vi.stubEnv("VERCEL_URL", "tumiki-jeq8r4h8i-rayven-38d708d3.vercel.app");

    const result = getOAuthRedirectUri();
    expect(result).toBe(
      "https://tumiki-jeq8r4h8i-rayven-38d708d3.vercel.app/api/oauth/callback",
    );
  });

  test("デフォルト値（ローカル開発環境）", () => {
    const result = getOAuthRedirectUri();
    expect(result).toBe("https://local.tumiki.cloud:3000/api/oauth/callback");
  });

  test("優先順位: NEXTAUTH_URL > VERCEL_URL", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://nextauth.com");
    vi.stubEnv("VERCEL_URL", "vercel-url.vercel.app");

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://nextauth.com/api/oauth/callback");
  });

  test("Vercel本番環境でカスタムドメイン使用時", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://manager.tumiki.cloud");

    const result = getOAuthRedirectUri();
    expect(result).toBe("https://manager.tumiki.cloud/api/oauth/callback");
  });

  test("ローカル開発環境でのデフォルト動作", () => {
    // 環境変数が一切設定されていない場合
    const result = getOAuthRedirectUri();
    expect(result).toBe("https://local.tumiki.cloud:3000/api/oauth/callback");
  });
});
