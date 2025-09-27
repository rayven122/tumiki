import { describe, expect, test } from "vitest";

import type { Result } from "../../lib/result/index.js";
import {
  err,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  unwrap,
  unwrapOr,
} from "../../lib/result/index.js";

describe("ok", () => {
  test("正常系: 文字列値でokを作成する", () => {
    const value = "success";
    const result = ok(value);

    expect(result).toStrictEqual({ ok: true, value: "success" });
    expect(result.ok).toStrictEqual(true);
    expect("value" in result).toStrictEqual(true);
    expect("error" in result).toStrictEqual(false);
  });

  test("正常系: 数値でokを作成する", () => {
    const value = 42;
    const result = ok(value);

    expect(result).toStrictEqual({ ok: true, value: 42 });
  });

  test("正常系: オブジェクトでokを作成する", () => {
    const value = { id: 1, name: "test" };
    const result = ok(value);

    expect(result).toStrictEqual({ ok: true, value: { id: 1, name: "test" } });
  });

  test("境界値: nullでokを作成する", () => {
    const result = ok(null);

    expect(result).toStrictEqual({ ok: true, value: null });
  });

  test("境界値: undefinedでokを作成する", () => {
    const result = ok(undefined);

    expect(result).toStrictEqual({ ok: true, value: undefined });
  });

  test("境界値: 空配列でokを作成する", () => {
    const result = ok([]);

    expect(result).toStrictEqual({ ok: true, value: [] });
  });

  test("境界値: 空オブジェクトでokを作成する", () => {
    const result = ok({});

    expect(result).toStrictEqual({ ok: true, value: {} });
  });
});

describe("err", () => {
  test("正常系: 文字列エラーでerrを作成する", () => {
    const error = "error message";
    const result = err(error);

    expect(result).toStrictEqual({ ok: false, error: "error message" });
    expect(result.ok).toStrictEqual(false);
    expect("error" in result).toStrictEqual(true);
    expect("value" in result).toStrictEqual(false);
  });

  test("正常系: Errorオブジェクトでerrを作成する", () => {
    const error = new Error("Something went wrong");
    const result = err(error);

    expect(result).toStrictEqual({ ok: false, error });
    expect(result.error).toStrictEqual(error);
  });

  test("正常系: カスタムエラーオブジェクトでerrを作成する", () => {
    const error = { code: 500, message: "Internal server error" };
    const result = err(error);

    expect(result).toStrictEqual({ ok: false, error });
  });

  test("境界値: nullエラーでerrを作成する", () => {
    const result = err(null);

    expect(result).toStrictEqual({ ok: false, error: null });
  });

  test("境界値: undefinedエラーでerrを作成する", () => {
    const result = err(undefined);

    expect(result).toStrictEqual({ ok: false, error: undefined });
  });

  test("境界値: 数値エラーでerrを作成する", () => {
    const result = err(404);

    expect(result).toStrictEqual({ ok: false, error: 404 });
  });
});

describe("isOk", () => {
  test("正常系: okの結果でtrueを返す", () => {
    const result = ok("success");

    expect(isOk(result)).toStrictEqual(true);
  });

  test("正常系: errの結果でfalseを返す", () => {
    const result = err("error");

    expect(isOk(result)).toStrictEqual(false);
  });

  test("境界値: okでnull値の場合でもtrueを返す", () => {
    const result = ok(null);

    expect(isOk(result)).toStrictEqual(true);
  });

  test("境界値: okでundefined値の場合でもtrueを返す", () => {
    const result = ok(undefined);

    expect(isOk(result)).toStrictEqual(true);
  });
});

describe("isErr", () => {
  test("正常系: errの結果でtrueを返す", () => {
    const result = err("error");

    expect(isErr(result)).toStrictEqual(true);
  });

  test("正常系: okの結果でfalseを返す", () => {
    const result = ok("success");

    expect(isErr(result)).toStrictEqual(false);
  });

  test("境界値: errでnull値の場合でもtrueを返す", () => {
    const result = err(null);

    expect(isErr(result)).toStrictEqual(true);
  });

  test("境界値: errでundefined値の場合でもtrueを返す", () => {
    const result = err(undefined);

    expect(isErr(result)).toStrictEqual(true);
  });
});

describe("unwrap", () => {
  test("正常系: okの結果から値を取得する", () => {
    const result = ok("success");
    const value = unwrap(result);

    expect(value).toStrictEqual("success");
  });

  test("正常系: okのオブジェクトから値を取得する", () => {
    const data = { id: 1, name: "test" };
    const result = ok(data);
    const value = unwrap(result);

    expect(value).toStrictEqual(data);
  });

  test("異常系: errの結果でErrorインスタンスをthrowする", () => {
    const error = new Error("Something went wrong");
    const result = err(error);

    expect(() => unwrap(result)).toThrow(error);
  });

  test("異常系: errの文字列エラーで新しいErrorをthrowする", () => {
    const result = err("error message");

    expect(() => unwrap(result)).toThrow("error message");
  });

  test("異常系: errのnullエラーで新しいErrorをthrowする", () => {
    const result = err(null);

    expect(() => unwrap(result)).toThrow("null");
  });

  test("異常系: errのundefinedエラーで新しいErrorをthrowする", () => {
    const result = err(undefined);

    expect(() => unwrap(result)).toThrow("undefined");
  });

  test("境界値: okのnull値を正常に取得する", () => {
    const result = ok(null);
    const value = unwrap(result);

    expect(value).toStrictEqual(null);
  });

  test("境界値: okのundefined値を正常に取得する", () => {
    const result = ok(undefined);
    const value = unwrap(result);

    expect(value).toStrictEqual(undefined);
  });
});

describe("unwrapOr", () => {
  test("正常系: okの結果から値を取得する", () => {
    const result = ok("success");
    const value = unwrapOr(result, "default");

    expect(value).toStrictEqual("success");
  });

  test("正常系: errの結果でデフォルト値を返す", () => {
    const result = err("error");
    const value = unwrapOr(result, "default");

    expect(value).toStrictEqual("default");
  });

  test("正常系: errでnullデフォルト値を返す", () => {
    const result = err("error");
    const value = unwrapOr(result, null);

    expect(value).toStrictEqual(null);
  });

  test("境界値: okのnull値とnullデフォルト値", () => {
    const result = ok(null);
    const value = unwrapOr(result, "default");

    expect(value).toStrictEqual(null);
  });

  test("境界値: okのundefined値とデフォルト値", () => {
    const result = ok(undefined);
    const value = unwrapOr(result, "default");

    expect(value).toStrictEqual(undefined);
  });

  test("境界値: 異なる型のデフォルト値", () => {
    const result: Result<string, string> = err("error");
    const value = unwrapOr(result, "default");

    expect(value).toStrictEqual("default");
  });
});

describe("map", () => {
  test("正常系: okの値を変換する", () => {
    const result = ok(5);
    const mapped = map(result, (x) => x * 2);

    expect(mapped).toStrictEqual({ ok: true, value: 10 });
  });

  test("正常系: okの文字列を数値に変換する", () => {
    const result = ok("42");
    const mapped = map(result, (x) => parseInt(x, 10));

    expect(mapped).toStrictEqual({ ok: true, value: 42 });
  });

  test("正常系: okのオブジェクトを変換する", () => {
    const result = ok({ id: 1, name: "test" });
    const mapped = map(result, (obj) => ({ ...obj, modified: true }));

    expect(mapped).toStrictEqual({
      ok: true,
      value: { id: 1, name: "test", modified: true },
    });
  });

  test("正常系: errの場合は変換せずにそのまま返す", () => {
    const result = err("error");
    const mapped = map(result, (x) => x.toString());

    expect(mapped).toStrictEqual({ ok: false, error: "error" });
  });

  test("境界値: okのnull値を変換する", () => {
    const result = ok(null);
    const mapped = map(result, (x) => `value: ${x}`);

    expect(mapped).toStrictEqual({ ok: true, value: "value: null" });
  });

  test("境界値: okのundefined値を変換する", () => {
    const result = ok(undefined);
    const mapped = map(result, (x) => x ?? "default");

    expect(mapped).toStrictEqual({ ok: true, value: "default" });
  });

  test("境界値: 変換関数が同じ値を返す", () => {
    const result = ok("test");
    const mapped = map(result, (x) => x);

    expect(mapped).toStrictEqual({ ok: true, value: "test" });
  });
});

describe("mapErr", () => {
  test("正常系: errのエラーを変換する", () => {
    const result = err("original error");
    const mapped = mapErr(result, (e) => `transformed: ${e}`);

    expect(mapped).toStrictEqual({
      ok: false,
      error: "transformed: original error",
    });
  });

  test("正常系: errのErrorオブジェクトを変換する", () => {
    const originalError = new Error("original");
    const result = err(originalError);
    const mapped = mapErr(result, (e) => new Error(`wrapped: ${e.message}`));

    expect(mapped.ok).toStrictEqual(false);
    expect(mapped.error).toBeInstanceOf(Error);
    expect((mapped.error as Error).message).toStrictEqual("wrapped: original");
  });

  test("正常系: okの場合は変換せずにそのまま返す", () => {
    const result = ok("success");
    const mapped = mapErr(result, (e) => `transformed: ${e}`);

    expect(mapped).toStrictEqual({ ok: true, value: "success" });
  });

  test("境界値: errのnullエラーを変換する", () => {
    const result = err(null);
    const mapped = mapErr(result, (e) => `error was: ${e}`);

    expect(mapped).toStrictEqual({ ok: false, error: "error was: null" });
  });

  test("境界値: errのundefinedエラーを変換する", () => {
    const result = err(undefined);
    const mapped = mapErr(result, (e) => e ?? "default error");

    expect(mapped).toStrictEqual({ ok: false, error: "default error" });
  });

  test("境界値: エラー変換関数が同じ値を返す", () => {
    const result = err("error");
    const mapped = mapErr(result, (e) => e);

    expect(mapped).toStrictEqual({ ok: false, error: "error" });
  });

  test("境界値: エラー変換関数が異なる型を返す", () => {
    const result = err("string error");
    const mapped = mapErr(result, (e) => ({ message: e, code: 500 }));

    expect(mapped).toStrictEqual({
      ok: false,
      error: { message: "string error", code: 500 },
    });
  });
});

describe("型ガード統合テスト", () => {
  test("正常系: isOkとunwrapの組み合わせ", () => {
    const result = ok("success");

    if (isOk(result)) {
      const value = result.value;
      expect(value).toStrictEqual("success");
    } else {
      // この分岐には入らないはず
      expect(true).toStrictEqual(false);
    }
  });

  test("正常系: isErrとerrorアクセスの組み合わせ", () => {
    const result = err("error");

    if (isErr(result)) {
      const error = result.error;
      expect(error).toStrictEqual("error");
    } else {
      // この分岐には入らないはず
      expect(true).toStrictEqual(false);
    }
  });

  test("境界値: 型推論が正しく動作することを確認", () => {
    const result: Result<number, string> = ok(42);

    if (isOk(result)) {
      // TypeScriptの型推論により、result.valueはnumber型
      const doubled = result.value * 2;
      expect(doubled).toStrictEqual(84);
    }

    if (isErr(result)) {
      // TypeScriptの型推論により、result.errorはstring型
      const length = result.error.length;
      // この分岐には入らないが、型チェックのため記述
      expect(length).toBeTypeOf("number");
    }
  });
});
