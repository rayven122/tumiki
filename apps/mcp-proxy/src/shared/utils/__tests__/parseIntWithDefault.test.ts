/**
 * parseIntWithDefault テスト
 */

import { describe, expect, test } from "vitest";

import { parseIntWithDefault } from "../parseIntWithDefault.js";

describe("parseIntWithDefault", () => {
  test("undefinedの場合はデフォルト値を返す", () => {
    expect(parseIntWithDefault(undefined, 100)).toBe(100);
  });

  test("空文字列の場合はデフォルト値を返す", () => {
    // parseInt("", 10) は NaN を返すため
    expect(parseIntWithDefault("", 100)).toBe(100);
  });

  test("有効な数値文字列の場合はパースした値を返す", () => {
    expect(parseIntWithDefault("42", 100)).toBe(42);
    expect(parseIntWithDefault("0", 100)).toBe(0);
    expect(parseIntWithDefault("-10", 100)).toBe(-10);
  });

  test("数値ではない文字列の場合はデフォルト値を返す", () => {
    expect(parseIntWithDefault("invalid", 100)).toBe(100);
    expect(parseIntWithDefault("abc123", 100)).toBe(100);
    expect(parseIntWithDefault("NaN", 100)).toBe(100);
  });

  test("先頭が数値の文字列の場合はその数値を返す", () => {
    // parseIntの動作: "123abc" -> 123
    expect(parseIntWithDefault("123abc", 100)).toBe(123);
    expect(parseIntWithDefault("42.5", 100)).toBe(42);
  });

  test("スペースを含む数値文字列の場合は正しくパースする", () => {
    // parseIntは先頭の空白を無視する
    expect(parseIntWithDefault("  42", 100)).toBe(42);
    expect(parseIntWithDefault("42  ", 100)).toBe(42);
  });

  test("異なるデフォルト値でも正しく動作する", () => {
    expect(parseIntWithDefault(undefined, 0)).toBe(0);
    expect(parseIntWithDefault(undefined, -1)).toBe(-1);
    expect(parseIntWithDefault(undefined, 999999)).toBe(999999);
  });
});
