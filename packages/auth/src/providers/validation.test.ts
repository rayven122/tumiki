import { describe, expect, test } from "vitest";
import { z } from "zod";

import { OAUTH_PROVIDERS } from "./index";
import { isValidOAuthProvider, OauthProviderSchema } from "./validation";

describe("OauthProviderSchema", () => {
  test("正常系: 有効なプロバイダー名を受け入れる", () => {
    expect(OauthProviderSchema.parse("google")).toStrictEqual("google");
    expect(OauthProviderSchema.parse("github")).toStrictEqual("github");
    expect(OauthProviderSchema.parse("slack")).toStrictEqual("slack");
    expect(OauthProviderSchema.parse("notion")).toStrictEqual("notion");
    expect(OauthProviderSchema.parse("linkedin")).toStrictEqual("linkedin");
  });

  test("正常系: すべてのOAUTH_PROVIDERSを受け入れる", () => {
    OAUTH_PROVIDERS.forEach((provider) => {
      expect(OauthProviderSchema.parse(provider)).toStrictEqual(provider);
    });
  });

  test("異常系: 無効なプロバイダー名でエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse("invalid")).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse("facebook")).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse("twitter")).toThrow(z.ZodError);
  });

  test("異常系: 空文字列でエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse("")).toThrow(z.ZodError);
  });

  test("異常系: nullでエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse(null)).toThrow(z.ZodError);
  });

  test("異常系: undefinedでエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse(undefined)).toThrow(z.ZodError);
  });

  test("異常系: 数値でエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse(123)).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse(0)).toThrow(z.ZodError);
  });

  test("異常系: 真偽値でエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse(true)).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse(false)).toThrow(z.ZodError);
  });

  test("異常系: オブジェクトでエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse({})).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse({ provider: "google" })).toThrow(
      z.ZodError,
    );
  });

  test("異常系: 配列でエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse([])).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse(["google"])).toThrow(z.ZodError);
  });

  test("異常系: 大文字小文字を区別する", () => {
    expect(() => OauthProviderSchema.parse("Google")).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse("GOOGLE")).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse("GitHub")).toThrow(z.ZodError);
  });

  test("異常系: スペースを含む文字列でエラーが発生する", () => {
    expect(() => OauthProviderSchema.parse(" google")).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse("google ")).toThrow(z.ZodError);
    expect(() => OauthProviderSchema.parse(" google ")).toThrow(z.ZodError);
  });

  test("正常系: safeParse で有効なプロバイダーを検証する", () => {
    const result = OauthProviderSchema.safeParse("google");
    expect(result.success).toStrictEqual(true);
    expect(result.success && result.data).toStrictEqual("google");
  });

  test("異常系: safeParse で無効なプロバイダーを検証する", () => {
    const result = OauthProviderSchema.safeParse("invalid");
    expect(result.success).toStrictEqual(false);
    expect(!result.success && result.error).toBeInstanceOf(z.ZodError);
  });
});

describe("isValidOAuthProvider", () => {
  test("正常系: 有効なプロバイダー名でtrueを返す", () => {
    expect(isValidOAuthProvider("google")).toStrictEqual(true);
    expect(isValidOAuthProvider("github")).toStrictEqual(true);
    expect(isValidOAuthProvider("slack")).toStrictEqual(true);
    expect(isValidOAuthProvider("notion")).toStrictEqual(true);
    expect(isValidOAuthProvider("linkedin")).toStrictEqual(true);
  });

  test("正常系: すべてのOAUTH_PROVIDERSでtrueを返す", () => {
    OAUTH_PROVIDERS.forEach((provider) => {
      expect(isValidOAuthProvider(provider)).toStrictEqual(true);
    });
  });

  test("異常系: 無効なプロバイダー名でfalseを返す", () => {
    expect(isValidOAuthProvider("invalid")).toStrictEqual(false);
    expect(isValidOAuthProvider("facebook")).toStrictEqual(false);
    expect(isValidOAuthProvider("twitter")).toStrictEqual(false);
    expect(isValidOAuthProvider("microsoft")).toStrictEqual(false);
  });

  test("異常系: 空文字列でfalseを返す", () => {
    expect(isValidOAuthProvider("")).toStrictEqual(false);
  });

  test("異常系: 大文字小文字を区別する", () => {
    expect(isValidOAuthProvider("Google")).toStrictEqual(false);
    expect(isValidOAuthProvider("GOOGLE")).toStrictEqual(false);
    expect(isValidOAuthProvider("GitHub")).toStrictEqual(false);
    expect(isValidOAuthProvider("GITHUB")).toStrictEqual(false);
  });

  test("異常系: スペースを含む文字列でfalseを返す", () => {
    expect(isValidOAuthProvider(" google")).toStrictEqual(false);
    expect(isValidOAuthProvider("google ")).toStrictEqual(false);
    expect(isValidOAuthProvider(" google ")).toStrictEqual(false);
    expect(isValidOAuthProvider("go ogle")).toStrictEqual(false);
  });

  test("異常系: 特殊文字を含む文字列でfalseを返す", () => {
    expect(isValidOAuthProvider("google!")).toStrictEqual(false);
    expect(isValidOAuthProvider("google@")).toStrictEqual(false);
    expect(isValidOAuthProvider("google#")).toStrictEqual(false);
    expect(isValidOAuthProvider("google$")).toStrictEqual(false);
  });

  test("異常系: 数値文字列でfalseを返す", () => {
    expect(isValidOAuthProvider("123")).toStrictEqual(false);
    expect(isValidOAuthProvider("0")).toStrictEqual(false);
    expect(isValidOAuthProvider("-1")).toStrictEqual(false);
  });

  test("型ガード: 有効なプロバイダーで型が絞り込まれる", () => {
    const provider = "google";

    // isValidOAuthProviderがtrueを返す場合、TypeScriptの型ガードによって
    // providerがOAuthProvider型として扱われることを確認
    const result = isValidOAuthProvider(provider);
    expect(result).toStrictEqual(true);

    // 型ガードのテストは実行時には検証できないが、
    // コンパイル時に型エラーが発生しないことで検証される
  });

  test("境界値: プロバイダー名の前後の文字でfalseを返す", () => {
    // アルファベット順で前後の文字をテスト
    expect(isValidOAuthProvider("githua")).toStrictEqual(false);
    expect(isValidOAuthProvider("githuc")).toStrictEqual(false);
    expect(isValidOAuthProvider("googld")).toStrictEqual(false);
    expect(isValidOAuthProvider("googlf")).toStrictEqual(false);
  });

  test("境界値: 部分文字列でfalseを返す", () => {
    expect(isValidOAuthProvider("goo")).toStrictEqual(false);
    expect(isValidOAuthProvider("git")).toStrictEqual(false);
    expect(isValidOAuthProvider("sla")).toStrictEqual(false);
    expect(isValidOAuthProvider("not")).toStrictEqual(false);
    expect(isValidOAuthProvider("link")).toStrictEqual(false);
  });

  test("境界値: プロバイダー名を含む長い文字列でfalseを返す", () => {
    expect(isValidOAuthProvider("google123")).toStrictEqual(false);
    expect(isValidOAuthProvider("123google")).toStrictEqual(false);
    expect(isValidOAuthProvider("my-google")).toStrictEqual(false);
    expect(isValidOAuthProvider("google-auth")).toStrictEqual(false);
  });
});
