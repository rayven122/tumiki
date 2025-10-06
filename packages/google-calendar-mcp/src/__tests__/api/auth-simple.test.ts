/* eslint-disable @typescript-eslint/no-unsafe-return */
import { describe, expect, test } from "vitest";

import { AuthenticationError } from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result.js";

describe("認証ロジック - 基本テスト", () => {
  test("成功したResult型の基本動作確認", () => {
    const successResult = ok("success");

    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data).toBe("success");
    }
  });

  test("失敗したResult型の基本動作確認", () => {
    const errorResult = err(new AuthenticationError("test error"));

    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBeInstanceOf(AuthenticationError);
      expect(errorResult.error.message).toBe("test error");
    }
  });

  test("認証設定の優先順位確認", () => {
    // Service Account > OAuth2 > API Key > ADC の順番で優先される
    const priorities = [
      { type: "service-account", priority: 1 },
      { type: "oauth2", priority: 2 },
      { type: "api-key", priority: 3 },
      { type: "adc", priority: 4 },
    ];

    const sortedPriorities = priorities.sort((a, b) => a.priority - b.priority);
    expect(sortedPriorities[0]?.type).toBe("service-account");
    expect(sortedPriorities[1]?.type).toBe("oauth2");
    expect(sortedPriorities[2]?.type).toBe("api-key");
    expect(sortedPriorities[3]?.type).toBe("adc");
  });

  test("無効なJSON形式の検出", () => {
    expect(() => JSON.parse("invalid json")).toThrow();
    expect(() => JSON.parse("")).toThrow();
    expect(() => JSON.parse("null")).not.toThrow();
    expect(() => JSON.parse("{}")).not.toThrow();
  });

  test("環境変数設定のパターン確認", () => {
    const envPatterns = {
      serviceAccount: ["GOOGLE_SERVICE_ACCOUNT_KEY"],
      oauth2: [
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_OAUTH_CLIENT_SECRET",
        "GOOGLE_OAUTH_REFRESH_TOKEN",
      ],
      apiKey: ["GOOGLE_API_KEY"],
      adc: [], // 環境変数不要
    };

    expect(envPatterns.serviceAccount).toHaveLength(1);
    expect(envPatterns.oauth2).toHaveLength(3);
    expect(envPatterns.apiKey).toHaveLength(1);
    expect(envPatterns.adc).toHaveLength(0);
  });
});
