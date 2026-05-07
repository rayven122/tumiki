import { describe, expect, test } from "vitest";
import { parseArgsToJson } from "../parse-args";

describe("parseArgsToJson", () => {
  test("空文字列を渡すと空配列のJSON文字列を返す", () => {
    expect(parseArgsToJson("")).toStrictEqual("[]");
  });

  test("スペース区切りの引数をJSON配列に変換する", () => {
    expect(parseArgsToJson("-y @mcp/server /tmp")).toStrictEqual(
      '["-y","@mcp/server","/tmp"]',
    );
  });

  test("既にJSON配列の文字列はそのまま返す", () => {
    const input = '["-y","server"]';
    expect(parseArgsToJson(input)).toStrictEqual(input);
  });

  test("非配列JSON（オブジェクト）はスペース区切りとして処理する", () => {
    const input = '{"key":"value"}';
    expect(parseArgsToJson(input)).toStrictEqual(JSON.stringify([input]));
  });

  test("非配列JSON（数値）はスペース区切りとして処理する", () => {
    expect(parseArgsToJson("42")).toStrictEqual(JSON.stringify(["42"]));
  });

  test("連続スペースは正しくフィルタされる", () => {
    expect(parseArgsToJson("  -y   server   /tmp  ")).toStrictEqual(
      '["-y","server","/tmp"]',
    );
  });

  test("タブ・改行混じりの入力を正しく分割する", () => {
    expect(parseArgsToJson("-y\tserver\n/tmp")).toStrictEqual(
      '["-y","server","/tmp"]',
    );
  });
});
