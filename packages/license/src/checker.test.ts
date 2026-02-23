import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearLicenseCache,
  getEdition,
  getEnabledFeatures,
  getLicenseInfo,
  hasFeature,
  isCE,
  isEE,
} from "./checker.js";
import { CURRENT_EE_FEATURES } from "./types.js";

describe("License Checker", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    clearLicenseCache();
  });

  describe("CE版（デフォルト）", () => {
    test("TUMIKI_EDITION未設定の場合はCE版", () => {
      vi.stubEnv("TUMIKI_EDITION", "");

      expect(isEE()).toBe(false);
      expect(isCE()).toBe(true);
      expect(getEdition()).toBe("ce");
    });

    test("CE版では機能が無効", () => {
      vi.stubEnv("TUMIKI_EDITION", "ce");

      expect(hasFeature("organization-creation")).toBe(false);
      expect(hasFeature("dynamic-search")).toBe(false);
      expect(getEnabledFeatures()).toStrictEqual([]);
    });

    test("getLicenseInfoがCE版の情報を返す", () => {
      vi.stubEnv("TUMIKI_EDITION", "");

      const info = getLicenseInfo();

      expect(info.edition).toBe("ce");
      expect(info.features).toStrictEqual([]);
    });
  });

  describe("EE版", () => {
    test("TUMIKI_EDITION=eeでEE版", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");

      expect(isEE()).toBe(true);
      expect(isCE()).toBe(false);
      expect(getEdition()).toBe("ee");
    });

    test("EE版では全機能が有効", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");

      expect(hasFeature("organization-creation")).toBe(true);
      expect(hasFeature("dynamic-search")).toBe(true);
      expect(hasFeature("custom-roles")).toBe(true);
    });

    test("EE版のgetEnabledFeaturesが現在の機能を返す", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");

      const features = getEnabledFeatures();

      expect(features).toStrictEqual(CURRENT_EE_FEATURES);
    });

    test("getLicenseInfoがEE版の情報を返す", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");

      const info = getLicenseInfo();

      expect(info.edition).toBe("ee");
      expect(info.features).toStrictEqual(CURRENT_EE_FEATURES);
    });
  });

  describe("キャッシュ", () => {
    test("getLicenseInfoがキャッシュされる", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");

      const info1 = getLicenseInfo();
      const info2 = getLicenseInfo();

      expect(info1).toBe(info2); // 同じオブジェクト参照
    });

    test("clearLicenseCacheでキャッシュがクリアされる", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");
      const info1 = getLicenseInfo();

      vi.stubEnv("TUMIKI_EDITION", "ce");
      clearLicenseCache();
      const info2 = getLicenseInfo();

      expect(info1.edition).toBe("ee");
      expect(info2.edition).toBe("ce");
    });
  });

  describe("将来のEE機能", () => {
    test("未実装の機能はEE版でも無効", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");

      // audit-log, sso, advanced-analyticsは将来の機能
      expect(hasFeature("audit-log")).toBe(false);
      expect(hasFeature("sso")).toBe(false);
      expect(hasFeature("advanced-analytics")).toBe(false);
    });
  });

  describe("NEXT_PUBLIC_EE_BUILD対応（Next.jsクライアント用）", () => {
    test("NEXT_PUBLIC_EE_BUILD=trueでEE版", () => {
      vi.stubEnv("TUMIKI_EDITION", "");
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");

      expect(isEE()).toBe(true);
      expect(getEdition()).toBe("ee");
    });

    test("TUMIKI_EDITION=ceでもNEXT_PUBLIC_EE_BUILD=trueならEE版", () => {
      vi.stubEnv("TUMIKI_EDITION", "ce");
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "true");

      // TUMIKI_EDITION=ee以外はフォールスルーしてNEXT_PUBLIC_EE_BUILDをチェック
      expect(isEE()).toBe(true);
    });

    test("TUMIKI_EDITION=eeはNEXT_PUBLIC_EE_BUILDより優先", () => {
      vi.stubEnv("TUMIKI_EDITION", "ee");
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "false");

      expect(isEE()).toBe(true);
    });

    test("両方未設定の場合はCE版", () => {
      vi.stubEnv("TUMIKI_EDITION", "");
      vi.stubEnv("NEXT_PUBLIC_EE_BUILD", "");

      expect(isEE()).toBe(false);
      expect(isCE()).toBe(true);
    });
  });
});
