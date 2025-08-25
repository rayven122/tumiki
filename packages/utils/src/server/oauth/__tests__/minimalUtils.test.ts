/**
 * Minimal OAuth Utilities のテスト
 */

import { describe, expect, test, vi } from "vitest";

import {
  buildRedirectUri,
  calculateTokenExpiry,
  createOAuthError,
  generateSessionId,
  isSessionValid,
  logOAuthFlow,
  OAuthErrorCodes,
} from "../minimalUtils.js";

describe("OAuthErrorCodes", () => {
  test("標準のOAuthエラーコードが定義されている", () => {
    expect(OAuthErrorCodes.INVALID_REQUEST).toBe("invalid_request");
    expect(OAuthErrorCodes.UNAUTHORIZED_CLIENT).toBe("unauthorized_client");
    expect(OAuthErrorCodes.ACCESS_DENIED).toBe("access_denied");
    expect(OAuthErrorCodes.SERVER_ERROR).toBe("server_error");
    expect(OAuthErrorCodes.SESSION_EXPIRED).toBe("session_expired");
  });
});

describe("createOAuthError", () => {
  test("基本的なOAuthエラーを作成する", () => {
    const error = createOAuthError("invalid_request");
    expect(error).toStrictEqual({
      error: "invalid_request",
      error_description: undefined,
      error_uri: undefined,
    });
  });

  test("説明付きのOAuthエラーを作成する", () => {
    const error = createOAuthError(
      "invalid_request",
      "Missing required parameter",
    );
    expect(error).toStrictEqual({
      error: "invalid_request",
      error_description: "Missing required parameter",
      error_uri: undefined,
    });
  });

  test("URI付きのOAuthエラーを作成する", () => {
    const error = createOAuthError(
      "invalid_request",
      "Missing required parameter",
      "https://example.com/error",
    );
    expect(error).toStrictEqual({
      error: "invalid_request",
      error_description: "Missing required parameter",
      error_uri: "https://example.com/error",
    });
  });
});

describe("generateSessionId", () => {
  test("セッションIDを生成する", () => {
    const sessionId = generateSessionId();
    expect(typeof sessionId).toBe("string");
    expect(sessionId.startsWith("session_")).toBe(true);
    expect(sessionId.length).toBeGreaterThan(20);
  });

  test("異なるセッションIDが生成される", () => {
    const sessionId1 = generateSessionId();
    const sessionId2 = generateSessionId();
    expect(sessionId1).not.toBe(sessionId2);
  });
});

describe("buildRedirectUri", () => {
  test("基本的なリダイレクトURIを構築する", () => {
    const uri = buildRedirectUri("https://example.com", "server123");
    expect(uri).toBe("https://example.com/oauth/callback/server123");
  });

  test("末尾スラッシュを正規化する", () => {
    const uri = buildRedirectUri("https://example.com/", "server123");
    expect(uri).toBe("https://example.com/oauth/callback/server123");
  });

  test("複数の末尾スラッシュを正規化する", () => {
    const uri = buildRedirectUri("https://example.com///", "server123");
    expect(uri).toBe("https://example.com/oauth/callback/server123");
  });

  test("パスが含まれる場合のリダイレクトURIを構築する", () => {
    const uri = buildRedirectUri("https://example.com/api", "server123");
    expect(uri).toBe("https://example.com/api/oauth/callback/server123");
  });
});

describe("calculateTokenExpiry", () => {
  test("トークンの有効期限を計算する", () => {
    const startTime = Date.now();
    const expiryDate = calculateTokenExpiry(3600); // 1時間
    const expectedExpiry = startTime + 3600 * 1000;

    // 時間の差が1秒以内であることを確認
    expect(Math.abs(expiryDate.getTime() - expectedExpiry)).toBeLessThan(1000);
  });
});

describe("isSessionValid", () => {
  test("有効なセッションを正しく判定する", () => {
    const session = {
      status: "pending",
      expiresAt: new Date(Date.now() + 60000), // 1分後
    };

    expect(isSessionValid(session)).toBe(true);
  });

  test("期限切れセッションを正しく判定する", () => {
    const session = {
      status: "pending",
      expiresAt: new Date(Date.now() - 60000), // 1分前
    };

    expect(isSessionValid(session)).toBe(false);
  });

  test("ステータスが正しくないセッションを正しく判定する", () => {
    const session = {
      status: "completed",
      expiresAt: new Date(Date.now() + 60000), // 1分後
    };

    expect(isSessionValid(session)).toBe(false);
  });
});

describe("logOAuthFlow", () => {
  test("ログを出力する（エラーなく実行される）", () => {
    // console.logをスパイしてテスト
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // Empty mock implementation
    });

    logOAuthFlow("test message", { key: "value" });

    expect(consoleSpy).toHaveBeenCalledWith("OAuth Flow: test message", {
      key: "value",
      timestamp: expect.any(String) as string,
    });

    consoleSpy.mockRestore();
  });
});
