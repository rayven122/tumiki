import { describe, expect, test } from "vitest";

import { isUpstreamAuthError } from "../auth-error.js";

describe("isUpstreamAuthError", () => {
  test("HTTP 401 を含む Error は true を返す", () => {
    expect(
      isUpstreamAuthError(new Error("Request failed: HTTP 401")),
    ).toStrictEqual(true);
  });

  test("HTTP 403 を含む Error は true を返す", () => {
    expect(
      isUpstreamAuthError(new Error("Forbidden response: 403")),
    ).toStrictEqual(true);
  });

  test("Unauthorized 文字列を含む Error は true を返す（大文字小文字不問）", () => {
    expect(
      isUpstreamAuthError(new Error("server returned: unauthorized")),
    ).toStrictEqual(true);
  });

  test("Forbidden 文字列を含む Error は true を返す", () => {
    expect(isUpstreamAuthError(new Error("Forbidden by policy"))).toStrictEqual(
      true,
    );
  });

  test("invalid_token を含む Error は true を返す", () => {
    expect(
      isUpstreamAuthError(new Error("error: invalid_token (rejected)")),
    ).toStrictEqual(true);
  });

  test("token_expired を含む Error は true を返す", () => {
    expect(
      isUpstreamAuthError(new Error("OAuth response: token_expired")),
    ).toStrictEqual(true);
  });

  test("expired_token を含む Error も true を返す（順序ハイフン違いを許容）", () => {
    expect(
      isUpstreamAuthError(new Error("expired-token detected")),
    ).toStrictEqual(true);
  });

  test("HTTP 500 は false を返す（TRANSIENT は対象外）", () => {
    expect(
      isUpstreamAuthError(new Error("Internal server error: 500")),
    ).toStrictEqual(false);
  });

  test("HTTP 429 (rate limit) は false を返す", () => {
    expect(isUpstreamAuthError(new Error("Rate limited: 429"))).toStrictEqual(
      false,
    );
  });

  test("接続エラーは false を返す", () => {
    expect(
      isUpstreamAuthError(new Error("ECONNREFUSED 127.0.0.1:8080")),
    ).toStrictEqual(false);
  });

  test("文字列を直接渡しても判定できる", () => {
    expect(isUpstreamAuthError("HTTP 401 Unauthorized")).toStrictEqual(true);
    expect(isUpstreamAuthError("server error 500")).toStrictEqual(false);
  });

  test("null / undefined / 数値 / 空文字は false", () => {
    expect(isUpstreamAuthError(null)).toStrictEqual(false);
    expect(isUpstreamAuthError(undefined)).toStrictEqual(false);
    expect(isUpstreamAuthError(401)).toStrictEqual(false);
    expect(isUpstreamAuthError("")).toStrictEqual(false);
  });

  test("4031 / 4012 のように単語境界で 401/403 を含まない数値は false（誤検知防止）", () => {
    expect(isUpstreamAuthError(new Error("error code 4012"))).toStrictEqual(
      false,
    );
    expect(isUpstreamAuthError(new Error("4031 retries"))).toStrictEqual(false);
  });
});
