import { describe, test, expect } from "vitest";
import { buildReauthDeepLink, parseReauthDeepLink } from "../deeplink";

describe("buildReauthDeepLink", () => {
  test("connectionId を埋め込んだ tumiki:// URL を返す", () => {
    expect(buildReauthDeepLink(7)).toBe("tumiki://oauth/reauth?connectionId=7");
  });

  test("大きな connectionId でも正しく組み立てる", () => {
    expect(buildReauthDeepLink(99999)).toBe(
      "tumiki://oauth/reauth?connectionId=99999",
    );
  });
});

describe("parseReauthDeepLink", () => {
  test("正しい URL から connectionId を取り出す", () => {
    expect(
      parseReauthDeepLink("tumiki://oauth/reauth?connectionId=42"),
    ).toStrictEqual({ connectionId: 42 });
  });

  test("プロトコルが違う場合は null", () => {
    expect(
      parseReauthDeepLink("https://oauth/reauth?connectionId=42"),
    ).toStrictEqual(null);
  });

  test("hostname が違う場合は null（Keycloak コールバックは弾く）", () => {
    expect(
      parseReauthDeepLink("tumiki://auth/callback?code=abc"),
    ).toStrictEqual(null);
  });

  test("pathname が違う場合は null", () => {
    expect(
      parseReauthDeepLink("tumiki://oauth/other?connectionId=42"),
    ).toStrictEqual(null);
  });

  test("connectionId が無い場合は null", () => {
    expect(parseReauthDeepLink("tumiki://oauth/reauth")).toStrictEqual(null);
  });

  test("connectionId が整数でない場合は null", () => {
    expect(
      parseReauthDeepLink("tumiki://oauth/reauth?connectionId=abc"),
    ).toStrictEqual(null);
    expect(
      parseReauthDeepLink("tumiki://oauth/reauth?connectionId=1.5"),
    ).toStrictEqual(null);
  });

  test("connectionId が 0 以下の場合は null（不正な値）", () => {
    expect(
      parseReauthDeepLink("tumiki://oauth/reauth?connectionId=0"),
    ).toStrictEqual(null);
    expect(
      parseReauthDeepLink("tumiki://oauth/reauth?connectionId=-5"),
    ).toStrictEqual(null);
  });

  test("URL としてパース不能な文字列は null", () => {
    expect(parseReauthDeepLink("not a url")).toStrictEqual(null);
    expect(parseReauthDeepLink("")).toStrictEqual(null);
  });

  test("buildReauthDeepLink の出力を parseReauthDeepLink でラウンドトリップできる", () => {
    const built = buildReauthDeepLink(123);
    expect(parseReauthDeepLink(built)).toStrictEqual({ connectionId: 123 });
  });
});
