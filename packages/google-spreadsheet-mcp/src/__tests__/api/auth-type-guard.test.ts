import { describe, expect, test } from "vitest";

import { isValidAuth } from "../../api/auth/index.js";

describe("isValidAuth", () => {
  describe("正常系", () => {
    test("有効なGoogleAuthオブジェクト（getAccessToken関数を持つ）", () => {
      const validAuth = {
        getAccessToken: () => Promise.resolve("token"),
        credentials: {},
      };

      const result = isValidAuth(validAuth);

      expect(result).toStrictEqual(true);
    });

    test("最小限の有効なオブジェクト（getAccessTokenのみ）", () => {
      const validAuth = {
        getAccessToken: () => Promise.resolve("token"),
      };

      const result = isValidAuth(validAuth);

      expect(result).toStrictEqual(true);
    });
  });

  describe("異常系", () => {
    test("null", () => {
      const result = isValidAuth(null);
      expect(result).toStrictEqual(false);
    });

    test("undefined", () => {
      const result = isValidAuth(undefined);
      expect(result).toStrictEqual(false);
    });

    test("文字列", () => {
      const result = isValidAuth("not an object");
      expect(result).toStrictEqual(false);
    });

    test("数値", () => {
      const result = isValidAuth(123);
      expect(result).toStrictEqual(false);
    });

    test("boolean", () => {
      const result = isValidAuth(true);
      expect(result).toStrictEqual(false);
    });

    test("空のオブジェクト", () => {
      const result = isValidAuth({});
      expect(result).toStrictEqual(false);
    });

    test("getAccessTokenプロパティがないオブジェクト", () => {
      const invalidAuth = {
        credentials: {},
        someOtherMethod: () => "test",
      };

      const result = isValidAuth(invalidAuth);
      expect(result).toStrictEqual(false);
    });

    test("getAccessTokenが関数でないオブジェクト", () => {
      const invalidAuth = {
        getAccessToken: "not a function",
        credentials: {},
      };

      const result = isValidAuth(invalidAuth);
      expect(result).toStrictEqual(false);
    });

    test("getAccessTokenがnullのオブジェクト", () => {
      const invalidAuth = {
        getAccessToken: null,
        credentials: {},
      };

      const result = isValidAuth(invalidAuth);
      expect(result).toStrictEqual(false);
    });

    test("getAccessTokenがundefinedのオブジェクト", () => {
      const invalidAuth = {
        getAccessToken: undefined,
        credentials: {},
      };

      const result = isValidAuth(invalidAuth);
      expect(result).toStrictEqual(false);
    });
  });

  describe("境界値", () => {
    test("配列", () => {
      const result = isValidAuth([]);
      expect(result).toStrictEqual(false);
    });

    test("関数", () => {
      const result = isValidAuth(() => "function");
      expect(result).toStrictEqual(false);
    });

    test("Date オブジェクト", () => {
      const result = isValidAuth(new Date());
      expect(result).toStrictEqual(false);
    });

    test("RegExp オブジェクト", () => {
      const result = isValidAuth(/regex/);
      expect(result).toStrictEqual(false);
    });
  });
});
