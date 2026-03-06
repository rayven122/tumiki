import { describe, test, expect } from "vitest";
import { mapHeadersToEnv } from "../envMapper.js";

describe("mapHeadersToEnv", () => {
  test("HTTPヘッダーを環境変数に変換する", () => {
    const headers = {
      "x-deepl-api-key": "deepl-key-123",
      "x-github-token": "ghp_abc",
    };
    const envVarKeys = ["X-DeepL-API-Key", "X-GitHub-Token"];

    const result = mapHeadersToEnv(headers, envVarKeys);

    expect(result).toStrictEqual({
      "X-DeepL-API-Key": "deepl-key-123",
      "X-GitHub-Token": "ghp_abc",
    });
  });

  test("存在しないヘッダーは無視される", () => {
    const headers = {
      "x-deepl-api-key": "deepl-key-123",
    };
    const envVarKeys = ["X-DeepL-API-Key", "X-Missing-Key"];

    const result = mapHeadersToEnv(headers, envVarKeys);

    expect(result).toStrictEqual({
      "X-DeepL-API-Key": "deepl-key-123",
    });
    expect(result).not.toHaveProperty("X-Missing-Key");
  });

  test("空のヘッダーからは空のオブジェクトを返す", () => {
    const headers = {};
    const envVarKeys = ["X-API-Key"];

    const result = mapHeadersToEnv(headers, envVarKeys);

    expect(result).toStrictEqual({});
  });

  test("空のenvVarKeysからは空のオブジェクトを返す", () => {
    const headers = {
      "x-api-key": "value",
    };
    const envVarKeys: string[] = [];

    const result = mapHeadersToEnv(headers, envVarKeys);

    expect(result).toStrictEqual({});
  });

  test("undefinedの値は除外される", () => {
    const headers: Record<string, string | undefined> = {
      "x-api-key": undefined,
      "x-token": "valid-token",
    };
    const envVarKeys = ["X-API-Key", "X-Token"];

    const result = mapHeadersToEnv(headers, envVarKeys);

    expect(result).toStrictEqual({
      "X-Token": "valid-token",
    });
  });
});
