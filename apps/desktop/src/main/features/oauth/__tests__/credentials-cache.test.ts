import { describe, test, expect, beforeEach } from "vitest";
import {
  clearCredentialsCache,
  deleteCachedCredentials,
  getCachedCredentials,
  hasCachedCredentials,
  setCachedCredentials,
} from "../credentials-cache";

describe("credentials-cache", () => {
  beforeEach(() => {
    clearCredentialsCache();
  });

  test("set した credentials を get で取得できる", () => {
    setCachedCredentials(1, { access_token: "abc" });
    expect(getCachedCredentials(1)).toStrictEqual({ access_token: "abc" });
  });

  test("未登録 secretId の get は undefined を返す", () => {
    expect(getCachedCredentials(999)).toBeUndefined();
  });

  test("hasCachedCredentials は登録有無を boolean で返す", () => {
    expect(hasCachedCredentials(1)).toBe(false);
    setCachedCredentials(1, { token: "x" });
    expect(hasCachedCredentials(1)).toBe(true);
  });

  test("同一 secretId への set は上書きされる", () => {
    setCachedCredentials(1, { access_token: "old" });
    setCachedCredentials(1, { access_token: "new" });
    expect(getCachedCredentials(1)).toStrictEqual({ access_token: "new" });
  });

  test("delete で指定 secretId のみ削除される", () => {
    setCachedCredentials(1, { token: "a" });
    setCachedCredentials(2, { token: "b" });
    deleteCachedCredentials(1);
    expect(getCachedCredentials(1)).toBeUndefined();
    expect(getCachedCredentials(2)).toStrictEqual({ token: "b" });
  });

  test("clear で全 secretId が削除される", () => {
    setCachedCredentials(1, { token: "a" });
    setCachedCredentials(2, { token: "b" });
    clearCredentialsCache();
    expect(hasCachedCredentials(1)).toBe(false);
    expect(hasCachedCredentials(2)).toBe(false);
  });
});
