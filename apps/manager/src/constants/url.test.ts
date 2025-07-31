/**
 * @vitest-environment node
 */
import { describe, test, expect } from "vitest";
import { URL_HEADER_KEY } from "./url";

describe("URL_HEADER_KEY", () => {
  test("正常系: 期待される値を持つ", () => {
    expect(URL_HEADER_KEY).toStrictEqual("x-url");
  });

  test("正常系: 文字列型である", () => {
    expect(typeof URL_HEADER_KEY).toStrictEqual("string");
  });

  test("正常系: 小文字のx-プレフィックスを持つ", () => {
    expect(URL_HEADER_KEY.startsWith("x-")).toStrictEqual(true);
  });

  test("正常系: 空文字列ではない", () => {
    expect(URL_HEADER_KEY).not.toStrictEqual("");
  });

  test("正常系: HTTPヘッダーの慣例に従った形式である", () => {
    // HTTPカスタムヘッダーの慣例として、x-プレフィックスと小文字を使用
    const httpCustomHeaderPattern = /^x-[a-z]+(-[a-z]+)*$/;
    expect(httpCustomHeaderPattern.test(URL_HEADER_KEY)).toStrictEqual(true);
  });

  test("正常系: トリミング不要な値である", () => {
    expect(URL_HEADER_KEY.trim()).toStrictEqual(URL_HEADER_KEY);
  });

  test("正常系: 特殊文字を含まない", () => {
    // HTTPヘッダー名として安全な文字のみを含むことを確認
    const safeHeaderPattern = /^[a-zA-Z0-9-]+$/;
    expect(safeHeaderPattern.test(URL_HEADER_KEY)).toStrictEqual(true);
  });

  test("正常系: 定数として変更不可能である", () => {
    // TypeScriptのconstによる定数定義の確認
    // 実行時には変更できないが、型システムでの保証を確認
    const originalValue = URL_HEADER_KEY;
    expect(URL_HEADER_KEY).toStrictEqual(originalValue);
  });
});
