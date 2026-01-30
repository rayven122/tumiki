import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { isValidCallbackUrl, determineRedirectUrl } from "../redirect-utils";

describe("isValidCallbackUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_URL", "https://tumiki.cloud");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("同一オリジンの相対パスは有効", () => {
    expect(isValidCallbackUrl("/dashboard")).toBe(true);
    expect(isValidCallbackUrl("/org/mcps")).toBe(true);
    expect(isValidCallbackUrl("/invite/abc123")).toBe(true);
  });

  test("同一オリジンの絶対URLは有効", () => {
    expect(isValidCallbackUrl("https://tumiki.cloud/dashboard")).toBe(true);
    expect(isValidCallbackUrl("https://tumiki.cloud/org/mcps")).toBe(true);
  });

  test("外部URLは無効（Open Redirect防止）", () => {
    expect(isValidCallbackUrl("https://evil.com/phishing")).toBe(false);
    expect(isValidCallbackUrl("https://tumiki.cloud.evil.com/")).toBe(false);
    expect(isValidCallbackUrl("//evil.com/path")).toBe(false);
  });

  test("禁止パスは無効（認証ループ防止）", () => {
    expect(isValidCallbackUrl("/signin")).toBe(false);
    expect(isValidCallbackUrl("/signin?callbackUrl=/dashboard")).toBe(false);
    expect(isValidCallbackUrl("/signup")).toBe(false);
    expect(isValidCallbackUrl("/api/auth/callback")).toBe(false);
  });

  test("不正なURLは無効", () => {
    expect(isValidCallbackUrl("javascript:alert(1)")).toBe(false);
    expect(isValidCallbackUrl("data:text/html,<script>")).toBe(false);
  });
});

describe("determineRedirectUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_URL", "https://tumiki.cloud");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("招待リンクは最優先", () => {
    const result = determineRedirectUrl("/invite/abc123", "my-org", false);
    expect(result).toBe("/invite/abc123");
  });

  test("組織スラッグがある場合は組織ページへ", () => {
    const result = determineRedirectUrl(null, "my-org", false);
    expect(result).toBe("/my-org/mcps");
  });

  test("有効なcallbackUrlがある場合はそれを使用", () => {
    const result = determineRedirectUrl("/custom/path", null, false);
    expect(result).toBe("/custom/path");
  });

  test("新規ユーザーはオンボーディングへ（first=true）", () => {
    const result = determineRedirectUrl(null, null, true);
    expect(result).toBe("/onboarding?first=true");
  });

  test("既存ユーザーはオンボーディングへ", () => {
    const result = determineRedirectUrl(null, null, false);
    expect(result).toBe("/onboarding");
  });

  test("無効なcallbackUrlは無視される", () => {
    const result = determineRedirectUrl("https://evil.com", null, false);
    expect(result).toBe("/onboarding");
  });

  test("禁止パスのcallbackUrlは無視される", () => {
    const result = determineRedirectUrl("/signin", "my-org", false);
    expect(result).toBe("/my-org/mcps");
  });

  test("組織スラッグがあれば有効なcallbackUrlより優先", () => {
    const result = determineRedirectUrl("/custom/path", "my-org", false);
    expect(result).toBe("/my-org/mcps");
  });

  test("招待リンクは組織スラッグより優先", () => {
    const result = determineRedirectUrl("/invite/abc123", "my-org", false);
    expect(result).toBe("/invite/abc123");
  });
});

describe("環境変数チェック", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("本番環境でNEXTAUTH_URLが未設定の場合は安全でないと判断", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    // 環境変数が未設定の場合、URLを検証できないためfalseを返す
    expect(isValidCallbackUrl("/dashboard")).toBe(false);
  });

  test("開発環境ではフォールバック値を使用", () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    // 開発環境ではエラーにならずフォールバック値が使用される
    expect(isValidCallbackUrl("/dashboard")).toBe(true);
  });
});
