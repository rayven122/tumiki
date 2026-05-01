import { describe, expect, test } from "vitest";

import { canonicalizeEmail, isValidEmail } from "./email.js";

describe("canonicalizeEmail", () => {
  test("大文字を小文字に変換する", () => {
    expect(canonicalizeEmail("Foo@Bar.Com")).toStrictEqual("foo@bar.com");
  });

  test("前後の空白を除去する", () => {
    expect(canonicalizeEmail("  user@example.com  ")).toStrictEqual(
      "user@example.com",
    );
  });

  test("既に正規化済みなら同値を返す", () => {
    expect(canonicalizeEmail("user@example.com")).toStrictEqual(
      "user@example.com",
    );
  });
});

describe("isValidEmail", () => {
  test("典型的な email を valid と判定する", () => {
    expect(isValidEmail("user@example.com")).toStrictEqual(true);
  });

  test("@ がない文字列を invalid と判定する", () => {
    expect(isValidEmail("not-an-email")).toStrictEqual(false);
  });

  test("ドメインに . がない場合 invalid と判定する", () => {
    expect(isValidEmail("user@example")).toStrictEqual(false);
  });

  test("空白を含む場合 invalid と判定する", () => {
    expect(isValidEmail("user @example.com")).toStrictEqual(false);
  });
});
