import { describe, expect, test } from "vitest";

import { generateBaseSlug } from "./slug.js";

describe("generateBaseSlug", () => {
  test("組織名を正規化してスラッグを生成", () => {
    expect(generateBaseSlug("My Company", false)).toBe("my-company");
    expect(generateBaseSlug("Acme Inc.", false)).toBe("acme-inc");
    expect(generateBaseSlug("  Test  Org  ", false)).toBe("test-org");
  });

  test("個人組織は@プレフィックス付き", () => {
    expect(generateBaseSlug("john doe", true)).toBe("@john-doe");
    expect(generateBaseSlug("Jane Smith", true)).toBe("@jane-smith");
    expect(generateBaseSlug("user123", true)).toBe("@user123");
  });

  test("特殊文字を削除", () => {
    expect(generateBaseSlug("My@#$Company!", false)).toBe("mycompany");
    expect(generateBaseSlug("Test (2024)", false)).toBe("test-2024");
    expect(generateBaseSlug("Hello, World!", false)).toBe("hello-world");
  });

  test("連続ハイフンを1つに統合", () => {
    expect(generateBaseSlug("My---Company", false)).toBe("my-company");
    expect(generateBaseSlug("Test  -  Org", false)).toBe("test-org");
  });

  test("先頭・末尾のハイフンを削除", () => {
    expect(generateBaseSlug("-my-company-", false)).toBe("my-company");
    expect(generateBaseSlug("---test---", false)).toBe("test");
  });

  test("アンダースコアは保持", () => {
    expect(generateBaseSlug("my_company", false)).toBe("my_company");
    expect(generateBaseSlug("test_org_2024", false)).toBe("test_org_2024");
  });

  test("数字を含む組織名", () => {
    expect(generateBaseSlug("Company 123", false)).toBe("company-123");
    expect(generateBaseSlug("2024 Startup", false)).toBe("2024-startup");
  });

  test("空白のみの入力", () => {
    expect(generateBaseSlug("   ", false)).toBe("");
    expect(generateBaseSlug("   ", true)).toBe("@");
  });

  test("日本語文字は削除される", () => {
    expect(generateBaseSlug("テスト Company", false)).toBe("company");
    expect(generateBaseSlug("会社名 123", false)).toBe("123");
  });
});
