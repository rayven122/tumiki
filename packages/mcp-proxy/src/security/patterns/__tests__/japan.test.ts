import { describe, expect, test } from "vitest";

import { japanPatterns, validateMyNumberChecksum } from "../japan.js";

// type 名から PIIPattern を引くヘルパー
const findByType = (type: string) => japanPatterns.find((p) => p.type === type);

// 11 桁の数字から正しいチェックディジットを計算してマイナンバー文字列を生成
const generateValidMyNumber = (first11: string): string => {
  if (first11.length !== 11) throw new Error("first11 must be 11 digits");
  const factors = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += Number(first11[i]) * factors[i]!;
  }
  const remainder = sum % 11;
  const checkDigit = remainder <= 1 ? 0 : 11 - remainder;
  return first11 + String(checkDigit);
};

describe("validateMyNumberChecksum", () => {
  test("正しいチェックディジットを持つマイナンバーは true", () => {
    expect(validateMyNumberChecksum(generateValidMyNumber("12345678901"))).toBe(
      true,
    );
    expect(validateMyNumberChecksum(generateValidMyNumber("00000000000"))).toBe(
      true,
    );
    expect(validateMyNumberChecksum(generateValidMyNumber("99999999998"))).toBe(
      true,
    );
  });

  test("間違ったチェックディジットは false", () => {
    const valid = generateValidMyNumber("12345678901");
    const invalid = valid.slice(0, 11) + ((Number(valid[11]) + 1) % 10);
    expect(validateMyNumberChecksum(invalid)).toBe(false);
  });

  test("12 桁でない文字列は false", () => {
    expect(validateMyNumberChecksum("1234567890")).toBe(false);
    expect(validateMyNumberChecksum("1234567890123")).toBe(false);
    expect(validateMyNumberChecksum("")).toBe(false);
  });
});

describe("japanPatterns", () => {
  test("主要な type が登録されている", () => {
    const types = japanPatterns.map((p) => p.type);
    expect(types).toContain("JP_PHONE");
    expect(types).toContain("JP_POSTAL_CODE");
    expect(types).toContain("JP_MY_NUMBER");
    expect(types).toContain("JP_DRIVER_LICENSE");
    expect(types).toContain("JP_PASSPORT");
    expect(types).toContain("JP_HEALTH_INSURANCE");
  });

  test("JP_PHONE: 固定電話 / 携帯電話の代表的フォーマットにマッチ", () => {
    const pattern = findByType("JP_PHONE");
    expect(pattern).toBeDefined();
    if (!pattern) return;
    expect("03-1234-5678").toMatch(pattern.regex);
    expect("090-1234-5678").toMatch(pattern.regex);
    expect("0120-123-456").toMatch(pattern.regex);
  });

  test("JP_POSTAL_CODE: 〒 記号有無の両方にマッチ", () => {
    const pattern = findByType("JP_POSTAL_CODE");
    expect(pattern).toBeDefined();
    if (!pattern) return;
    expect("100-0001").toMatch(pattern.regex);
    expect("〒150-0001").toMatch(pattern.regex);
  });

  test("JP_MY_NUMBER: 正しいチェックディジット付き 12 桁にマッチ", () => {
    const pattern = findByType("JP_MY_NUMBER");
    expect(pattern).toBeDefined();
    if (!pattern) return;
    const validNumber = generateValidMyNumber("12345678901");
    expect(validNumber).toMatch(pattern.regex);
  });

  test("JP_PASSPORT: 英字2 + 数字7 形式", () => {
    const pattern = findByType("JP_PASSPORT");
    expect(pattern).toBeDefined();
    if (!pattern) return;
    expect("TR1234567").toMatch(pattern.regex);
    expect("AB9876543").toMatch(pattern.regex);
    expect("tr1234567").not.toMatch(pattern.regex); // 大文字のみ
    expect("ABC1234567").not.toMatch(pattern.regex); // 英字3桁は不可
  });
});
