import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("EE/CE エディション設定", () => {
  beforeEach(() => {
    // 各テスト前に環境変数をリセット
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("CE版（EE_BUILD未設定）", () => {
    test("EE_AVAILABLEがfalseを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");

      const { EE_AVAILABLE } = await import("../config");
      expect(EE_AVAILABLE).toBe(false);
    });

    test("ORG_CREATION_ENABLEDがfalseを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");

      const { ORG_CREATION_ENABLED } = await import("../config");
      expect(ORG_CREATION_ENABLED).toBe(false);
    });

    test("isEEFeatureAvailableが全機能でfalseを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");

      const { isEEFeatureAvailable } = await import("../config");

      expect(isEEFeatureAvailable("member-management")).toBe(false);
      expect(isEEFeatureAvailable("role-management")).toBe(false);
      expect(isEEFeatureAvailable("group-management")).toBe(false);
      expect(isEEFeatureAvailable("organization-creation")).toBe(false);
      expect(isEEFeatureAvailable("dynamic-search")).toBe(false);
      expect(isEEFeatureAvailable("pii-dashboard")).toBe(false);
    });

    test("getAvailableEEFeaturesが空配列を返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");

      const { getAvailableEEFeatures } = await import("../config");
      expect(getAvailableEEFeatures()).toStrictEqual([]);
    });

    test("getAllEEFeatureInfoが全機能を無効として返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");

      const { getAllEEFeatureInfo } = await import("../config");
      const features = getAllEEFeatureInfo();

      expect(features).toHaveLength(6);
      expect(features.every((f) => f.available === false)).toBe(true);
    });
  });

  describe("EE版（EE_BUILD=true）", () => {
    test("EE_AVAILABLEがtrueを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");

      const { EE_AVAILABLE } = await import("../config");
      expect(EE_AVAILABLE).toBe(true);
    });

    test("基本的なEE機能が有効", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");

      const { isEEFeatureAvailable } = await import("../config");

      expect(isEEFeatureAvailable("member-management")).toBe(true);
      expect(isEEFeatureAvailable("role-management")).toBe(true);
      expect(isEEFeatureAvailable("group-management")).toBe(true);
    });

    test("organization-creationはデフォルトで無効", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "");

      const { isEEFeatureAvailable, ORG_CREATION_ENABLED } = await import(
        "../config"
      );

      expect(ORG_CREATION_ENABLED).toBe(false);
      expect(isEEFeatureAvailable("organization-creation")).toBe(false);
    });

    test("getAvailableEEFeaturesが基本機能を含む", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "");

      const { getAvailableEEFeatures } = await import("../config");
      const features = getAvailableEEFeatures();

      expect(features).toContain("member-management");
      expect(features).toContain("role-management");
      expect(features).toContain("group-management");
      expect(features).not.toContain("organization-creation");
    });

    test("getAllEEFeatureInfoが正しい情報を返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "");

      const { getAllEEFeatureInfo } = await import("../config");
      const features = getAllEEFeatureInfo();

      expect(features).toHaveLength(6);

      const memberManagement = features.find(
        (f) => f.feature === "member-management",
      );
      expect(memberManagement?.available).toBe(true);
      expect(memberManagement?.description).toBe("組織メンバーの管理機能");

      const orgCreation = features.find(
        (f) => f.feature === "organization-creation",
      );
      expect(orgCreation?.available).toBe(false);

      const dynamicSearch = features.find(
        (f) => f.feature === "dynamic-search",
      );
      expect(dynamicSearch?.available).toBe(true);
      expect(dynamicSearch?.description).toBe("MCPツールの動的検索機能");

      const piiDashboard = features.find((f) => f.feature === "pii-dashboard");
      expect(piiDashboard?.available).toBe(true);
      expect(piiDashboard?.description).toBe("PII検知ダッシュボード表示機能");
    });
  });

  describe("EE版 + 組織作成機能有効", () => {
    test("ORG_CREATION_ENABLEDがtrueを返す", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "true");

      const { ORG_CREATION_ENABLED } = await import("../config");
      expect(ORG_CREATION_ENABLED).toBe(true);
    });

    test("organization-creationが有効", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "true");

      const { isEEFeatureAvailable } = await import("../config");
      expect(isEEFeatureAvailable("organization-creation")).toBe(true);
    });

    test("getAvailableEEFeaturesが全機能を含む", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "true");

      const { getAvailableEEFeatures } = await import("../config");
      const features = getAvailableEEFeatures();

      expect(features).toHaveLength(6);
      expect(features).toContain("organization-creation");
      expect(features).toContain("dynamic-search");
      expect(features).toContain("pii-dashboard");
    });
  });

  describe("CE版で組織作成環境変数が設定されている場合", () => {
    test("ORG_CREATION_ENABLEDはfalseのまま", async () => {
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_ORG_CREATION", "true");

      const { ORG_CREATION_ENABLED, isEEFeatureAvailable } = await import(
        "../config"
      );

      // EE_AVAILABLEがfalseなので、組織作成も無効
      expect(ORG_CREATION_ENABLED).toBe(false);
      expect(isEEFeatureAvailable("organization-creation")).toBe(false);
    });
  });
});
