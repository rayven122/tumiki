import { describe, expect, test } from "vitest";

import {
  calculateTokenReductionRate,
  formatDataSize,
  formatTokenCount,
} from "../formatters.js";

describe("formatDataSize", () => {
  test("0バイトの場合は'0 B'を返す", () => {
    expect(formatDataSize(0)).toStrictEqual("0 B");
  });

  test("バイト単位で表示する", () => {
    expect(formatDataSize(500)).toStrictEqual("500 B");
  });

  test("KB単位で表示する", () => {
    expect(formatDataSize(1024)).toStrictEqual("1 KB");
    expect(formatDataSize(2048)).toStrictEqual("2 KB");
  });

  test("MB単位で表示する", () => {
    expect(formatDataSize(1024 * 1024)).toStrictEqual("1 MB");
  });

  test("GB単位で表示する", () => {
    expect(formatDataSize(1024 * 1024 * 1024)).toStrictEqual("1 GB");
  });
});

describe("formatTokenCount", () => {
  test("nullの場合はハイフンを返す", () => {
    expect(formatTokenCount(null)).toStrictEqual("-");
  });

  test("undefinedの場合はハイフンを返す", () => {
    expect(formatTokenCount(undefined)).toStrictEqual("-");
  });

  test("0の場合は'0'を返す", () => {
    expect(formatTokenCount(0)).toStrictEqual("0");
  });

  test("1000未満の場合はそのまま数値を文字列で返す", () => {
    expect(formatTokenCount(999)).toStrictEqual("999");
    expect(formatTokenCount(1)).toStrictEqual("1");
  });

  test("1000以上の場合はK単位で表示する", () => {
    expect(formatTokenCount(1000)).toStrictEqual("1.0K");
    expect(formatTokenCount(1234)).toStrictEqual("1.2K");
    expect(formatTokenCount(9999)).toStrictEqual("10.0K");
  });

  test("100万以上の場合はM単位で表示する", () => {
    expect(formatTokenCount(1000000)).toStrictEqual("1.0M");
    expect(formatTokenCount(1234567)).toStrictEqual("1.2M");
  });
});

describe("calculateTokenReductionRate", () => {
  test("入力がnullの場合はnullを返す", () => {
    expect(calculateTokenReductionRate(null, 700)).toStrictEqual(null);
  });

  test("出力がnullの場合はnullを返す", () => {
    expect(calculateTokenReductionRate(1000, null)).toStrictEqual(null);
  });

  test("入力がundefinedの場合はnullを返す", () => {
    expect(calculateTokenReductionRate(undefined, 700)).toStrictEqual(null);
  });

  test("出力がundefinedの場合はnullを返す", () => {
    expect(calculateTokenReductionRate(1000, undefined)).toStrictEqual(null);
  });

  test("入力が0の場合はnullを返す", () => {
    expect(calculateTokenReductionRate(0, 700)).toStrictEqual(null);
  });

  test("削減率を正しく計算する", () => {
    expect(calculateTokenReductionRate(1000, 700)).toStrictEqual(30);
    expect(calculateTokenReductionRate(1000, 500)).toStrictEqual(50);
    expect(calculateTokenReductionRate(1000, 1000)).toStrictEqual(0);
  });

  test("削減率が負の場合も計算する（増加した場合）", () => {
    expect(calculateTokenReductionRate(700, 1000)).toStrictEqual(-43);
  });
});
