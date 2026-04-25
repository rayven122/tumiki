/**
 * token-validator.ts のテスト
 */

import { describe, expect, test } from "vitest";

import {
  isExpiringSoon,
  isTokenExpired,
  toDecryptedToken,
} from "../token-validator.js";

// McpOAuthTokenの最小限のモック型
type MinimalToken = {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  oauthClient: { id: string };
};

const createToken = (overrides: Partial<MinimalToken> = {}): MinimalToken => ({
  id: "token-id-1",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  oauthClient: { id: "client-id-1" },
  ...overrides,
});

describe("isTokenExpired", () => {
  test("expiresAtがnullの場合はfalseを返す", () => {
    const token = createToken({ expiresAt: null });
    expect(isTokenExpired(token as never)).toStrictEqual(false);
  });

  test("有効期限が現在時刻より未来の場合はfalseを返す", () => {
    const token = createToken({
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
    expect(isTokenExpired(token as never)).toStrictEqual(false);
  });

  test("有効期限が現在時刻より過去の場合はtrueを返す", () => {
    const token = createToken({
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(isTokenExpired(token as never)).toStrictEqual(true);
  });

  test("有効期限が現在時刻と同じ場合はtrueを返す（期限切れ）", () => {
    const now = Date.now();
    const token = createToken({
      expiresAt: new Date(now),
    });
    // expiresAt.getTime() <= Date.now() なのでtrueになる
    expect(isTokenExpired(token as never)).toStrictEqual(true);
  });
});

describe("isExpiringSoon", () => {
  test("expiresAtがnullの場合はfalseを返す", () => {
    const token = createToken({ expiresAt: null });
    expect(isExpiringSoon(token as never)).toStrictEqual(false);
  });

  test("有効期限がバッファより遠い将来の場合はfalseを返す", () => {
    // デフォルトバッファ5分より遠い将来
    const token = createToken({
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(isExpiringSoon(token as never)).toStrictEqual(false);
  });

  test("有効期限がデフォルトバッファ内に入っている場合はtrueを返す", () => {
    // デフォルトバッファ5分以内
    const token = createToken({
      expiresAt: new Date(Date.now() + 3 * 60 * 1000),
    });
    expect(isExpiringSoon(token as never)).toStrictEqual(true);
  });

  test("カスタムバッファ秒数を指定できる", () => {
    // バッファ1分を指定
    const token = createToken({
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
    // 2分後に期限切れ、バッファ1分 → 期限切れ間近ではない
    expect(isExpiringSoon(token as never, 60)).toStrictEqual(false);
    // 2分後に期限切れ、バッファ3分 → 期限切れ間近
    expect(isExpiringSoon(token as never, 3 * 60)).toStrictEqual(true);
  });

  test("すでに期限切れのトークンはtrueを返す", () => {
    const token = createToken({
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(isExpiringSoon(token as never)).toStrictEqual(true);
  });
});

describe("toDecryptedToken", () => {
  test("McpOAuthTokenをDecryptedTokenに変換する", () => {
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const token = createToken({ expiresAt });

    const result = toDecryptedToken(token as never);

    expect(result).toStrictEqual({
      id: "token-id-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt,
      oauthClientId: "client-id-1",
    });
  });

  test("refreshTokenがnullのトークンを正しく変換する", () => {
    const token = createToken({ refreshToken: null });

    const result = toDecryptedToken(token as never);

    expect(result.refreshToken).toStrictEqual(null);
  });

  test("expiresAtがnullのトークンを正しく変換する", () => {
    const token = createToken({ expiresAt: null });

    const result = toDecryptedToken(token as never);

    expect(result.expiresAt).toStrictEqual(null);
  });
});
