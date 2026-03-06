import { describe, expect, test } from "vitest";

import { countTokens } from "../tokenCount.js";

describe("countTokens", () => {
  test("空文字列は0トークンを返す", () => {
    expect(countTokens("")).toBe(0);
  });

  test("単純な英語テキストのトークン数を計算する", () => {
    const text = "Hello, world!";
    const tokens = countTokens(text);
    // cl100k_baseでは "Hello, world!" は3-4トークン程度
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  test("日本語テキストのトークン数を計算する", () => {
    const text = "こんにちは、世界！";
    const tokens = countTokens(text);
    // 日本語は1文字あたり約1-2トークン
    expect(tokens).toBeGreaterThan(0);
  });

  test("JSONオブジェクトのトークン数を計算する", () => {
    const json = JSON.stringify({
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
    });
    const tokens = countTokens(json);
    expect(tokens).toBeGreaterThan(0);
  });

  test("長いテキストは多くのトークンを返す", () => {
    const shortText = "Hello";
    const longText = "Hello ".repeat(100);

    const shortTokens = countTokens(shortText);
    const longTokens = countTokens(longText);

    expect(longTokens).toBeGreaterThan(shortTokens);
  });

  test("同じエンコーダーインスタンスを再利用する", () => {
    const text = "Test text";
    const tokens1 = countTokens(text);
    const tokens2 = countTokens(text);
    const tokens3 = countTokens(text);

    expect(tokens1).toBe(tokens2);
    expect(tokens2).toBe(tokens3);
  });
});
