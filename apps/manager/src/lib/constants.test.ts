/**
 * @vitest-environment node
 */
import { describe, test, expect } from "vitest";
import {
  isProductionEnvironment,
  isDevelopmentEnvironment,
  isTestEnvironment,
  guestRegex,
} from "./constants";

describe("環境変数定数", () => {
  test("isProductionEnvironment は boolean を返す", () => {
    // 環境変数はモジュールレベルで評価されるため、実行時の値をテスト
    expect(typeof isProductionEnvironment).toStrictEqual("boolean");
    expect(isProductionEnvironment).toStrictEqual(
      process.env.NODE_ENV === "production",
    );
  });

  test("isDevelopmentEnvironment は boolean を返す", () => {
    // 環境変数はモジュールレベルで評価されるため、実行時の値をテスト
    expect(typeof isDevelopmentEnvironment).toStrictEqual("boolean");
    expect(isDevelopmentEnvironment).toStrictEqual(
      process.env.NODE_ENV === "development",
    );
  });

  test("isTestEnvironment は boolean を返す", () => {
    // 環境変数はモジュールレベルで評価されるため、実行時の値をテスト
    expect(typeof isTestEnvironment).toStrictEqual("boolean");
    expect(isTestEnvironment).toStrictEqual(
      Boolean(
        process.env.PLAYWRIGHT_TEST_BASE_URL ??
          process.env.PLAYWRIGHT ??
          process.env.CI_PLAYWRIGHT,
      ),
    );
  });
});

describe("guestRegex", () => {
  test("guest-数字形式の文字列にマッチする", () => {
    expect(guestRegex.test("guest-1")).toStrictEqual(true);
    expect(guestRegex.test("guest-123")).toStrictEqual(true);
    expect(guestRegex.test("guest-9999999")).toStrictEqual(true);
  });

  test("guest-0にマッチする", () => {
    expect(guestRegex.test("guest-0")).toStrictEqual(true);
  });

  test("guest-の後に数字がない場合はマッチしない", () => {
    expect(guestRegex.test("guest-")).toStrictEqual(false);
  });

  test("guest-の後に数字以外がある場合はマッチしない", () => {
    expect(guestRegex.test("guest-abc")).toStrictEqual(false);
    expect(guestRegex.test("guest-12a")).toStrictEqual(false);
    expect(guestRegex.test("guest-12.3")).toStrictEqual(false);
  });

  test("guest-で始まらない場合はマッチしない", () => {
    expect(guestRegex.test("user-123")).toStrictEqual(false);
    expect(guestRegex.test("123")).toStrictEqual(false);
    expect(guestRegex.test("guest123")).toStrictEqual(false);
  });

  test("前後に余分な文字がある場合はマッチしない", () => {
    expect(guestRegex.test(" guest-123")).toStrictEqual(false);
    expect(guestRegex.test("guest-123 ")).toStrictEqual(false);
    expect(guestRegex.test("prefix-guest-123")).toStrictEqual(false);
    expect(guestRegex.test("guest-123-suffix")).toStrictEqual(false);
  });

  test("空文字列にはマッチしない", () => {
    expect(guestRegex.test("")).toStrictEqual(false);
  });

  test("guestのみではマッチしない", () => {
    expect(guestRegex.test("guest")).toStrictEqual(false);
  });

  test("正規表現パターンの構造を検証", () => {
    // 正規表現のソースコードが期待通りか確認
    expect(guestRegex.source).toStrictEqual("^guest-\\d+$");
    // フラグが設定されていないか確認
    expect(guestRegex.flags).toStrictEqual("");
  });
});
