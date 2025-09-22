import type { YoutubeApiKey } from "@/api/apiKey.js";
import type { Failure, Success } from "@/lib/result.js";
import { getApiKeyFromEnv } from "@/api/apiKey.js";
import { describe, expect, test } from "vitest";

describe("getApiKeyFromEnv", () => {
  describe("正常系", () => {
    test("有効なAPIキーが設定されている場合にOKを返す", () => {
      const mockEnv = {
        YOUTUBE_API_KEY: "test-api-key-from-env",
      } as NodeJS.ProcessEnv;

      const result = getApiKeyFromEnv(mockEnv);

      expect(result).toStrictEqual({
        success: true,
        data: "test-api-key-from-env" as YoutubeApiKey,
      } satisfies Success<YoutubeApiKey>);
    });

    test("両端に空白があるAPIキーが設定されている場合にトリムしてOKを返す", () => {
      const mockEnv = {
        YOUTUBE_API_KEY: "  test-api-key  ",
      } as NodeJS.ProcessEnv;

      const result = getApiKeyFromEnv(mockEnv);

      expect(result).toStrictEqual({
        success: true,
        data: "test-api-key" as YoutubeApiKey,
      } satisfies Success<YoutubeApiKey>);
    });
  });

  describe("異常系", () => {
    test("環境変数が設定されていない場合にエラーを返す", () => {
      const mockEnv = {} as NodeJS.ProcessEnv;

      const result = getApiKeyFromEnv(mockEnv);

      expect(result).toStrictEqual({
        success: false,
        error: new Error("API key is required"),
      } satisfies Failure<Error>);
    });

    test.each([
      ["空文字列", ""],
      ["空白文字のみ", "   "],
      ["タブのみ", "\t\t"],
      ["改行のみ", "\n\n"],
      ["混合空白文字", " \t\n "],
    ])("環境変数が%sの場合にエラーを返す", (_, value) => {
      const mockEnv = {
        YOUTUBE_API_KEY: value,
      } as NodeJS.ProcessEnv;

      const result = getApiKeyFromEnv(mockEnv);

      expect(result).toStrictEqual({
        success: false,
        error: new Error("API key is required"),
      } satisfies Failure<Error>);
    });
  });
});
