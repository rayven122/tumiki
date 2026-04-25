/**
 * types.ts のテスト
 */

import { describe, expect, test } from "vitest";

import {
  isDecryptedToken,
  ReAuthRequiredError,
  TokenRefreshError,
} from "../types.js";

describe("isDecryptedToken", () => {
  test("有効なDecryptedTokenオブジェクトの場合はtrueを返す", () => {
    const validToken = {
      id: "token-id-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: new Date(),
      oauthClientId: "client-id-1",
    };

    expect(isDecryptedToken(validToken)).toStrictEqual(true);
  });

  test("refreshTokenがnullの場合はtrueを返す", () => {
    const tokenWithNullRefresh = {
      id: "token-id-1",
      accessToken: "access-token",
      refreshToken: null,
      expiresAt: new Date(),
      oauthClientId: "client-id-1",
    };

    expect(isDecryptedToken(tokenWithNullRefresh)).toStrictEqual(true);
  });

  test("expiresAtがnullの場合はtrueを返す", () => {
    const tokenWithNullExpiry = {
      id: "token-id-1",
      accessToken: "access-token",
      refreshToken: null,
      expiresAt: null,
      oauthClientId: "client-id-1",
    };

    expect(isDecryptedToken(tokenWithNullExpiry)).toStrictEqual(true);
  });

  test("必須フィールドが欠けている場合はfalseを返す", () => {
    const invalidToken = {
      accessToken: "access-token",
      // id が欠けている
    };

    expect(isDecryptedToken(invalidToken)).toStrictEqual(false);
  });

  test("nullの場合はfalseを返す", () => {
    expect(isDecryptedToken(null)).toStrictEqual(false);
  });

  test("文字列の場合はfalseを返す", () => {
    expect(isDecryptedToken("string")).toStrictEqual(false);
  });
});

describe("ReAuthRequiredError", () => {
  test("正しいプロパティを持つエラーを作成できる", () => {
    const error = new ReAuthRequiredError(
      "Re-auth required",
      "token-id-1",
      "user-id-1",
      "server-id-1",
    );

    expect(error.message).toStrictEqual("Re-auth required");
    expect(error.tokenId).toStrictEqual("token-id-1");
    expect(error.userId).toStrictEqual("user-id-1");
    expect(error.mcpServerId).toStrictEqual("server-id-1");
    expect(error.name).toStrictEqual("ReAuthRequiredError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("TokenRefreshError", () => {
  test("causeなしでエラーを作成できる", () => {
    const error = new TokenRefreshError("Refresh failed", "token-id-1");

    expect(error.message).toStrictEqual("Refresh failed");
    expect(error.tokenId).toStrictEqual("token-id-1");
    expect(error.cause).toBeUndefined();
    expect(error.name).toStrictEqual("TokenRefreshError");
    expect(error).toBeInstanceOf(Error);
  });

  test("causeありでエラーを作成できる", () => {
    const cause = new Error("Original error");
    const error = new TokenRefreshError("Refresh failed", "token-id-1", cause);

    expect(error.cause).toStrictEqual(cause);
  });
});
