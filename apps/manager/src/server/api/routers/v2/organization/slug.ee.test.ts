// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { describe, expect, test } from "vitest";

import { generateBaseSlug, normalizeSlug } from "@tumiki/db/utils/slug";

describe("normalizeSlug", () => {
  test("文字列をslug形式に正規化", () => {
    expect(normalizeSlug("My Company")).toBe("my-company");
    expect(normalizeSlug("  Test  Org  ")).toBe("test-org");
  });

  test("特殊文字を削除", () => {
    expect(normalizeSlug("My@#$Company!")).toBe("mycompany");
    expect(normalizeSlug("Test (2024)")).toBe("test-2024");
  });

  test("日本語文字は削除される", () => {
    expect(normalizeSlug("テスト Company")).toBe("company");
    expect(normalizeSlug("会社名")).toBe("");
  });
});

describe("generateBaseSlug", () => {
  describe("org（組織用）", () => {
    test("組織名を正規化してスラッグを生成", () => {
      expect(generateBaseSlug("My Company", "org")).toBe("my-company");
      expect(generateBaseSlug("Acme Inc.", "org")).toBe("acme-inc");
      expect(generateBaseSlug("  Test  Org  ", "org")).toBe("test-org");
    });

    test("特殊文字を削除", () => {
      expect(generateBaseSlug("My@#$Company!", "org")).toBe("mycompany");
      expect(generateBaseSlug("Test (2024)", "org")).toBe("test-2024");
      expect(generateBaseSlug("Hello, World!", "org")).toBe("hello-world");
    });

    test("連続ハイフンを1つに統合", () => {
      expect(generateBaseSlug("My---Company", "org")).toBe("my-company");
      expect(generateBaseSlug("Test  -  Org", "org")).toBe("test-org");
    });

    test("先頭・末尾のハイフンを削除", () => {
      expect(generateBaseSlug("-my-company-", "org")).toBe("my-company");
      expect(generateBaseSlug("---test---", "org")).toBe("test");
    });

    test("アンダースコアは保持", () => {
      expect(generateBaseSlug("my_company", "org")).toBe("my_company");
      expect(generateBaseSlug("test_org_2024", "org")).toBe("test_org_2024");
    });

    test("数字を含む組織名", () => {
      expect(generateBaseSlug("Company 123", "org")).toBe("company-123");
      expect(generateBaseSlug("2024 Startup", "org")).toBe("2024-startup");
    });

    test("日本語文字は削除される", () => {
      expect(generateBaseSlug("テスト Company", "org")).toBe("company");
      expect(generateBaseSlug("会社名 123", "org")).toBe("123");
    });

    test("日本語のみの場合はorg-ランダム文字列を生成", () => {
      const slug = generateBaseSlug("会社名", "org");
      expect(slug).toMatch(/^org-[a-z0-9]{6}$/);
    });

    test("空白のみの場合はorg-ランダム文字列を生成", () => {
      const slug = generateBaseSlug("   ", "org");
      expect(slug).toMatch(/^org-[a-z0-9]{6}$/);
    });
  });

  describe("personalOrg（個人用）", () => {
    test("@プレフィックス付きでスラッグを生成", () => {
      expect(generateBaseSlug("john doe", "personalOrg")).toBe("@john-doe");
      expect(generateBaseSlug("Jane Smith", "personalOrg")).toBe("@jane-smith");
      expect(generateBaseSlug("user123", "personalOrg")).toBe("@user123");
    });

    test("日本語のみの場合は@user-ランダム文字列を生成", () => {
      const slug = generateBaseSlug("太郎", "personalOrg");
      expect(slug).toMatch(/^@user-[a-z0-9]{6}$/);
    });

    test("空白のみの場合は@user-ランダム文字列を生成", () => {
      const slug = generateBaseSlug("   ", "personalOrg");
      expect(slug).toMatch(/^@user-[a-z0-9]{6}$/);
    });
  });

  describe("role（ロール用）", () => {
    test("ロール名を正規化してスラッグを生成", () => {
      expect(generateBaseSlug("Admin", "role")).toBe("admin");
      expect(generateBaseSlug("Super User", "role")).toBe("super-user");
      expect(generateBaseSlug("read_only", "role")).toBe("read_only");
    });

    test("日本語のみの場合はrole-ランダム文字列を生成", () => {
      const slug = generateBaseSlug("管理者", "role");
      expect(slug).toMatch(/^role-[a-z0-9]{6}$/);
    });

    test("空白のみの場合はrole-ランダム文字列を生成", () => {
      const slug = generateBaseSlug("   ", "role");
      expect(slug).toMatch(/^role-[a-z0-9]{6}$/);
    });
  });
});
