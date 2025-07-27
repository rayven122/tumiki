import { describe, expect, test } from "bun:test";

import {
  buildAuth0Sub,
  extractProviderFromSub,
  extractUserIdFromSub,
  isAuth0Sub,
} from "./auth0Utils";

describe("extractUserIdFromSub", () => {
  test("GitHub の sub から userId を抽出できる", () => {
    const sub = "github|141129258";
    const result = extractUserIdFromSub(sub);
    expect(result).toStrictEqual("141129258");
  });

  test("Google OAuth2 の sub から userId を抽出できる", () => {
    const sub = "google-oauth2|102635221332040133994";
    const result = extractUserIdFromSub(sub);
    expect(result).toStrictEqual("102635221332040133994");
  });

  test("無効な形式の sub でエラーが発生する", () => {
    expect(() => extractUserIdFromSub("invalid-sub")).toThrow(
      "Invalid Auth0 sub format: invalid-sub",
    );
  });

  test("パイプが複数ある sub でエラーが発生する", () => {
    expect(() => extractUserIdFromSub("github|123|456")).toThrow(
      "Invalid Auth0 sub format: github|123|456",
    );
  });
});

describe("buildAuth0Sub", () => {
  test("provider と userId から sub を構築できる", () => {
    const result = buildAuth0Sub("github", "141129258");
    expect(result).toStrictEqual("github|141129258");
  });

  test("Google OAuth2 の sub を構築できる", () => {
    const result = buildAuth0Sub("google-oauth2", "102635221332040133994");
    expect(result).toStrictEqual("google-oauth2|102635221332040133994");
  });
});

describe("extractProviderFromSub", () => {
  test("GitHub の sub から provider を抽出できる", () => {
    const sub = "github|141129258";
    const result = extractProviderFromSub(sub);
    expect(result).toStrictEqual("github");
  });

  test("Google OAuth2 の sub から provider を抽出できる", () => {
    const sub = "google-oauth2|102635221332040133994";
    const result = extractProviderFromSub(sub);
    expect(result).toStrictEqual("google-oauth2");
  });

  test("無効な形式の sub でエラーが発生する", () => {
    expect(() => extractProviderFromSub("invalid-sub")).toThrow(
      "Invalid Auth0 sub format: invalid-sub",
    );
  });
});

describe("isAuth0Sub", () => {
  test("有効な Auth0 sub 形式を判定できる", () => {
    expect(isAuth0Sub("github|141129258")).toStrictEqual(true);
    expect(isAuth0Sub("google-oauth2|102635221332040133994")).toStrictEqual(
      true,
    );
  });

  test("無効な形式を判定できる", () => {
    expect(isAuth0Sub("invalid-sub")).toStrictEqual(false);
    expect(isAuth0Sub("")).toStrictEqual(false);
    expect(isAuth0Sub("|")).toStrictEqual(false);
    expect(isAuth0Sub("github|")).toStrictEqual(false);
    expect(isAuth0Sub("|123")).toStrictEqual(false);
    expect(isAuth0Sub("github|123|456")).toStrictEqual(false);
  });
});
