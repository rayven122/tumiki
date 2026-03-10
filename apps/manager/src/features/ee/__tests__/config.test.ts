import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { clearLicenseCache } from "@tumiki/license";

describe("EE/CE エディション設定", () => {
  beforeEach(() => {
    // 各テスト前に環境変数とモジュールをリセット
    vi.resetModules();
    clearLicenseCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearLicenseCache();
  });

  describe("CE版（NEXT_PUBLIC_TUMIKI_EDITION未設定）", () => {
    test("EE_AVAILABLEがfalseを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "");

      const { EE_AVAILABLE } = await import("../config");
      expect(EE_AVAILABLE).toBe(false);
    });

    test("ORG_CREATION_ENABLEDがfalseを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "");

      const { ORG_CREATION_ENABLED } = await import("../config");
      expect(ORG_CREATION_ENABLED).toBe(false);
    });

    test("isEEFeatureAvailableが全機能でfalseを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "");

      const { isEEFeatureAvailable } = await import("../config");

      expect(isEEFeatureAvailable("member-management")).toBe(false);
      expect(isEEFeatureAvailable("role-management")).toBe(false);
      expect(isEEFeatureAvailable("group-management")).toBe(false);
      expect(isEEFeatureAvailable("organization-creation")).toBe(false);
      expect(isEEFeatureAvailable("dynamic-search")).toBe(false);
      expect(isEEFeatureAvailable("custom-roles")).toBe(false);
      expect(isEEFeatureAvailable("pii-dashboard")).toBe(false);
    });

    test("getAvailableEEFeaturesが空配列を返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "");

      const { getAvailableEEFeatures } = await import("../config");
      expect(getAvailableEEFeatures()).toStrictEqual([]);
    });

    test("getAllEEFeatureInfoが全機能を無効として返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "");

      const { getAllEEFeatureInfo } = await import("../config");
      const features = getAllEEFeatureInfo();

      expect(features).toHaveLength(7);
      expect(features.every((f) => f.available === false)).toBe(true);
    });
  });

  describe("EE版（NEXT_PUBLIC_TUMIKI_EDITION=ee）", () => {
    test("EE_AVAILABLEがtrueを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");

      const { EE_AVAILABLE } = await import("../config");
      expect(EE_AVAILABLE).toBe(true);
    });

    test("基本的なEE機能が有効", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");

      const { isEEFeatureAvailable } = await import("../config");

      expect(isEEFeatureAvailable("member-management")).toBe(true);
      expect(isEEFeatureAvailable("role-management")).toBe(true);
      expect(isEEFeatureAvailable("group-management")).toBe(true);
      expect(isEEFeatureAvailable("custom-roles")).toBe(true);
      expect(isEEFeatureAvailable("pii-dashboard")).toBe(true);
    });

    test("organization-creationが有効（EEなら全機能有効）", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");

      const { isEEFeatureAvailable, ORG_CREATION_ENABLED } =
        await import("../config");

      // 新しい実装ではEE版なら組織作成も有効
      expect(ORG_CREATION_ENABLED).toBe(true);
      expect(isEEFeatureAvailable("organization-creation")).toBe(true);
    });

    test("getAvailableEEFeaturesが全機能を含む", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");

      const { getAvailableEEFeatures } = await import("../config");
      const features = getAvailableEEFeatures();

      expect(features).toContain("member-management");
      expect(features).toContain("role-management");
      expect(features).toContain("group-management");
      expect(features).toContain("organization-creation");
      expect(features).toContain("dynamic-search");
      expect(features).toContain("custom-roles");
      expect(features).toContain("pii-dashboard");
    });

    test("getAllEEFeatureInfoが正しい情報を返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");

      const { getAllEEFeatureInfo } = await import("../config");
      const features = getAllEEFeatureInfo();

      expect(features).toHaveLength(7);

      const memberManagement = features.find(
        (f) => f.feature === "member-management",
      );
      expect(memberManagement?.available).toBe(true);
      expect(memberManagement?.description).toBe("組織メンバーの管理機能");

      const orgCreation = features.find(
        (f) => f.feature === "organization-creation",
      );
      expect(orgCreation?.available).toBe(true);

      const dynamicSearch = features.find(
        (f) => f.feature === "dynamic-search",
      );
      expect(dynamicSearch?.available).toBe(true);
      expect(dynamicSearch?.description).toBe("MCPツールの動的検索機能");

      const customRoles = features.find((f) => f.feature === "custom-roles");
      expect(customRoles?.available).toBe(true);
      expect(customRoles?.description).toBe("カスタムロール機能");

      const piiDashboard = features.find((f) => f.feature === "pii-dashboard");
      expect(piiDashboard?.available).toBe(true);
      expect(piiDashboard?.description).toBe("PII検知ダッシュボード表示機能");
    });
  });
});
