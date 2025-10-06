import { describe, expect, test } from "vitest";

import { err, ok } from "../../lib/result.js";

describe("ok", () => {
  test("成功値を含むOkオブジェクトを作成する", () => {
    const result = ok("success value");

    expect(result.success).toBe(true);
    expect(result.data).toBe("success value");
  });

  test("数値の成功値を含むOkオブジェクトを作成する", () => {
    const result = ok(42);

    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });

  test("オブジェクトの成功値を含むOkオブジェクトを作成する", () => {
    const value = { id: 1, name: "test" };
    const result = ok(value);

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(value);
  });

  test("nullの成功値を含むOkオブジェクトを作成する", () => {
    const result = ok(null);

    expect(result.success).toBe(true);
    expect(result.data).toBe(null);
  });

  test("undefinedの成功値を含むOkオブジェクトを作成する", () => {
    const result = ok(undefined);

    expect(result.success).toBe(true);
    expect(result.data).toBe(undefined);
  });
});

describe("err", () => {
  test("エラー値を含むErrオブジェクトを作成する", () => {
    const error = new Error("test error");
    const result = err(error);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });

  test("文字列エラーを含むErrオブジェクトを作成する", () => {
    const result = err("error message");

    expect(result.success).toBe(false);
    expect(result.error).toBe("error message");
  });

  test("数値エラーを含むErrオブジェクトを作成する", () => {
    const result = err(404);

    expect(result.success).toBe(false);
    expect(result.error).toBe(404);
  });

  test("オブジェクトエラーを含むErrオブジェクトを作成する", () => {
    const error = { code: "NOT_FOUND", message: "Resource not found" };
    const result = err(error);

    expect(result.success).toBe(false);
    expect(result.error).toStrictEqual(error);
  });
});
