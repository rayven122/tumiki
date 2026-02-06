import { describe, test, expect } from "vitest";
import { toError } from "../toError.js";

describe("toError", () => {
  test("Error オブジェクトをそのまま返す", () => {
    const error = new Error("test error");
    const result = toError(error);

    expect(result).toBe(error);
    expect(result.message).toBe("test error");
  });

  test("文字列を Error オブジェクトに変換する", () => {
    const result = toError("string error");

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("string error");
  });

  test("数値を Error オブジェクトに変換する", () => {
    const result = toError(42);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("42");
  });

  test("null を Error オブジェクトに変換する", () => {
    const result = toError(null);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("null");
  });

  test("undefined を Error オブジェクトに変換する", () => {
    const result = toError(undefined);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("undefined");
  });

  test("オブジェクトを Error オブジェクトに変換する", () => {
    const result = toError({ key: "value" });

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("[object Object]");
  });

  test("Error のサブクラスをそのまま返す", () => {
    const typeError = new TypeError("type error");
    const result = toError(typeError);

    expect(result).toBe(typeError);
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe("type error");
  });
});
