import { describe, expect, test } from "vitest";
import {
  issueLicenseInputSchema,
  listLicensesInputSchema,
  getLicenseInputSchema,
  revokeLicenseInputSchema,
} from "../schemas";

const VALID_CUID = "clh1234567890abcdefghijk0";

describe("issueLicenseInputSchema", () => {
  describe("PERSONAL", () => {
    test("有効なPERSONALライセンス入力を受け入れる", () => {
      const input = {
        type: "PERSONAL" as const,
        subject: "user@example.com",
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 90,
      };
      expect(() => issueLicenseInputSchema.parse(input)).not.toThrow();
    });

    test("オプションフィールドを含む有効な入力を受け入れる", () => {
      const input = {
        type: "PERSONAL" as const,
        subject: "user@example.com",
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 365,
        plan: "pro",
        notes: "テスト発行",
      };
      const result = issueLicenseInputSchema.parse(input);
      expect(result.type).toStrictEqual("PERSONAL");
      expect(result.plan).toStrictEqual("pro");
    });

    test("無効なメールアドレスを拒否する", () => {
      const input = {
        type: "PERSONAL" as const,
        subject: "not-an-email",
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 90,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });

    test("featuresが空配列の場合を拒否する", () => {
      const input = {
        type: "PERSONAL" as const,
        subject: "user@example.com",
        features: [],
        ttlDays: 90,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });

    test("ttlDaysが0の場合を拒否する", () => {
      const input = {
        type: "PERSONAL" as const,
        subject: "user@example.com",
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 0,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });

    test("ttlDaysが731の場合を拒否する", () => {
      const input = {
        type: "PERSONAL" as const,
        subject: "user@example.com",
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 731,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });
  });

  describe("TENANT", () => {
    test("有効なTENANTライセンス入力を受け入れる", () => {
      const input = {
        type: "TENANT" as const,
        subject: VALID_CUID,
        tenantId: VALID_CUID,
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 365,
      };
      expect(() => issueLicenseInputSchema.parse(input)).not.toThrow();
    });

    test("tenantIdがない場合を拒否する", () => {
      const input = {
        type: "TENANT" as const,
        subject: VALID_CUID,
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 365,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });

    test("不正なcuid形式のsubjectを拒否する", () => {
      const input = {
        type: "TENANT" as const,
        subject: "not-a-cuid",
        tenantId: VALID_CUID,
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 365,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });

    test("subjectとtenantIdが異なる場合を拒否する", () => {
      const OTHER_CUID = "clh9999999990abcdefghijk0";
      const input = {
        type: "TENANT" as const,
        subject: VALID_CUID,
        tenantId: OTHER_CUID,
        features: ["dynamic-search"] as ["dynamic-search"],
        ttlDays: 365,
      };
      expect(() => issueLicenseInputSchema.parse(input)).toThrow();
    });
  });
});

describe("listLicensesInputSchema", () => {
  test("空入力でデフォルト値を適用する", () => {
    const result = listLicensesInputSchema.parse({});
    expect(result.limit).toStrictEqual(20);
  });

  test("statusにEXPIREDを受け入れる", () => {
    const input = { status: "EXPIRED" as const };
    expect(() => listLicensesInputSchema.parse(input)).not.toThrow();
  });

  test("limitが0の場合を拒否する", () => {
    expect(() => listLicensesInputSchema.parse({ limit: 0 })).toThrow();
  });

  test("limitが101の場合を拒否する", () => {
    expect(() => listLicensesInputSchema.parse({ limit: 101 })).toThrow();
  });

  test("typeフィルタを受け入れる", () => {
    const result = listLicensesInputSchema.parse({ type: "PERSONAL" });
    expect(result.type).toStrictEqual("PERSONAL");
  });
});

describe("getLicenseInputSchema", () => {
  test("有効なcuidを受け入れる", () => {
    expect(() => getLicenseInputSchema.parse({ id: VALID_CUID })).not.toThrow();
  });

  test("不正なidを拒否する", () => {
    expect(() => getLicenseInputSchema.parse({ id: "invalid" })).toThrow();
  });
});

describe("revokeLicenseInputSchema", () => {
  test("有効なcuidのみで受け入れる", () => {
    expect(() =>
      revokeLicenseInputSchema.parse({ id: VALID_CUID }),
    ).not.toThrow();
  });

  test("reasonを含む入力を受け入れる", () => {
    const result = revokeLicenseInputSchema.parse({
      id: VALID_CUID,
      reason: "セキュリティ漏洩のため失効",
    });
    expect(result.reason).toStrictEqual("セキュリティ漏洩のため失効");
  });

  test("不正なidを拒否する", () => {
    expect(() => revokeLicenseInputSchema.parse({ id: "bad" })).toThrow();
  });
});
