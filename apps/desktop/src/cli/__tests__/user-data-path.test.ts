import { describe, test, expect, vi, afterEach } from "vitest";
import { homedir } from "os";
import { join } from "path";
import { resolveUserDataPath } from "../../shared/user-data-path";

describe("resolveUserDataPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("macOSの場合はLibrary/Application Support/Tumikiを返す", () => {
    // 現在のプラットフォームがdarwinの場合のみテスト
    if (process.platform !== "darwin") return;

    const result = resolveUserDataPath();
    expect(result).toBe(join(homedir(), "Library/Application Support/Tumiki"));
  });

  test("戻り値が空文字列でない", () => {
    const result = resolveUserDataPath();
    expect(result.length).toBeGreaterThan(0);
  });

  test("戻り値にTumikiが含まれる", () => {
    const result = resolveUserDataPath();
    expect(result).toContain("Tumiki");
  });
});
