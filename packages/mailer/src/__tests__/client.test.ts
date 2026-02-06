import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { getDefaultMailConfig } from "../client.js";

describe("getDefaultMailConfig", () => {
  describe("デフォルト値（環境変数未設定時）", () => {
    beforeAll(() => {
      vi.stubEnv("SMTP_HOST", undefined);
      vi.stubEnv("SMTP_PORT", undefined);
      vi.stubEnv("SMTP_USER", undefined);
      vi.stubEnv("SMTP_PASS", undefined);
      vi.stubEnv("FROM_EMAIL", undefined);
      vi.stubEnv("FROM_NAME", undefined);
    });

    afterAll(() => {
      vi.unstubAllEnvs();
    });

    test("SMTP_HOSTが未設定の場合は空文字を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.host).toStrictEqual("");
    });

    test("SMTP_PORTが未設定の場合は587を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.port).toStrictEqual(587);
    });

    test("SMTP_PORTが587の場合はsecureがfalseになる", () => {
      const config = getDefaultMailConfig();

      expect(config.secure).toStrictEqual(false);
    });

    test("SMTP_USERが未設定の場合は空文字を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.auth.user).toStrictEqual("");
    });

    test("SMTP_PASSが未設定の場合は空文字を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.auth.pass).toStrictEqual("");
    });

    test("FROM_EMAILが未設定の場合は空文字を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.from).toStrictEqual("");
    });

    test("FROM_NAMEが未設定の場合はundefinedを返す", () => {
      const config = getDefaultMailConfig();

      expect(config.fromName).toBeUndefined();
    });
  });

  describe("環境変数が設定されている場合", () => {
    beforeAll(() => {
      vi.stubEnv("SMTP_HOST", "custom.smtp.server");
      vi.stubEnv("SMTP_PORT", "465");
      vi.stubEnv("SMTP_USER", "test-user");
      vi.stubEnv("SMTP_PASS", "test-password");
      vi.stubEnv("FROM_EMAIL", "custom@example.com");
      vi.stubEnv("FROM_NAME", "Custom Team");
    });

    afterAll(() => {
      vi.unstubAllEnvs();
    });

    test("SMTP_HOSTの環境変数値を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.host).toStrictEqual("custom.smtp.server");
    });

    test("SMTP_PORTの環境変数値を数値として返す", () => {
      const config = getDefaultMailConfig();

      expect(config.port).toStrictEqual(465);
    });

    test("SMTP_PORTが465の場合はsecureがtrueになる", () => {
      const config = getDefaultMailConfig();

      expect(config.secure).toStrictEqual(true);
    });

    test("SMTP_USERの環境変数値を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.auth.user).toStrictEqual("test-user");
    });

    test("SMTP_PASSの環境変数値を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.auth.pass).toStrictEqual("test-password");
    });

    test("FROM_EMAILの環境変数値を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.from).toStrictEqual("custom@example.com");
    });

    test("FROM_NAMEの環境変数値を返す", () => {
      const config = getDefaultMailConfig();

      expect(config.fromName).toStrictEqual("Custom Team");
    });
  });

  describe("ポート番号のバリエーション", () => {
    afterAll(() => {
      vi.unstubAllEnvs();
    });

    test("ポート587の場合はsecureがfalse", () => {
      vi.stubEnv("SMTP_PORT", "587");

      const config = getDefaultMailConfig();

      expect(config.port).toStrictEqual(587);
      expect(config.secure).toStrictEqual(false);
    });

    test("ポート25の場合はsecureがfalse", () => {
      vi.stubEnv("SMTP_PORT", "25");

      const config = getDefaultMailConfig();

      expect(config.port).toStrictEqual(25);
      expect(config.secure).toStrictEqual(false);
    });

    test("ポート2525の場合はsecureがfalse", () => {
      vi.stubEnv("SMTP_PORT", "2525");

      const config = getDefaultMailConfig();

      expect(config.port).toStrictEqual(2525);
      expect(config.secure).toStrictEqual(false);
    });
  });
});
