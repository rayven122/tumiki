import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  getAvailableVerificationUserIds,
  getDefaultVerificationUserId,
  isVerificationModeEnabled,
} from "./verification";

describe("検証モードユーティリティ", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("isVerificationModeEnabled", () => {
    test("本番環境では常にfalse", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VERIFICATION_MODE", "true");
      expect(isVerificationModeEnabled()).toBe(false);
    });

    test("開発環境でVERIFICATION_MODE=trueの場合にtrue", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("VERIFICATION_MODE", "true");
      expect(isVerificationModeEnabled()).toBe(true);
    });

    test("開発環境でVERIFICATION_MODE=falseの場合にfalse", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("VERIFICATION_MODE", "false");
      expect(isVerificationModeEnabled()).toBe(false);
    });

    test("環境変数が未設定の場合にfalse", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(isVerificationModeEnabled()).toBe(false);
    });
  });

  describe("getDefaultVerificationUserId", () => {
    test("環境変数が設定されている場合、その値を返す", () => {
      vi.stubEnv("VERIFICATION_USER_ID", "verification|custom");
      expect(getDefaultVerificationUserId()).toBe("verification|custom");
    });

    test("環境変数が未設定の場合、デフォルト値を返す", () => {
      expect(getDefaultVerificationUserId()).toBe("verification|admin");
    });
  });

  describe("getAvailableVerificationUserIds", () => {
    test("環境変数が設定されている場合、パースして配列を返す", () => {
      vi.stubEnv(
        "VERIFICATION_AVAILABLE_USERS",
        "verification|admin,verification|user,verification|test",
      );
      expect(getAvailableVerificationUserIds()).toStrictEqual([
        "verification|admin",
        "verification|user",
        "verification|test",
      ]);
    });

    test("環境変数が未設定の場合、デフォルト値を返す", () => {
      expect(getAvailableVerificationUserIds()).toStrictEqual([
        "verification|admin",
        "verification|user",
      ]);
    });

    test("スペースを含むカンマ区切り文字列を正しくパース", () => {
      vi.stubEnv(
        "VERIFICATION_AVAILABLE_USERS",
        "verification|admin , verification|user , verification|test",
      );
      expect(getAvailableVerificationUserIds()).toStrictEqual([
        "verification|admin",
        "verification|user",
        "verification|test",
      ]);
    });
  });
});
