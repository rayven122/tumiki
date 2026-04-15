import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../../shared/user-data-path", () => ({
  resolveUserDataPath: vi.fn(() => "/mock/user-data"),
}));

// readFile のモック
const mockReadFile = vi.fn();
vi.mock("fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

import { decryptCredentials } from "../decryptor";

describe("decryptCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("空文字列の場合は '{}' を返す", async () => {
    const result = await decryptCredentials("");
    expect(result).toBe("{}");
  });

  test("プレフィックスなしの場合はそのまま返す（後方互換）", async () => {
    // コロンを含まない平文JSON（コロンがあるとprefix検出される）
    const plain = "{}";
    const result = await decryptCredentials(plain);
    expect(result).toBe(plain);
  });

  test("セパレータなしの文字列はそのまま返す", async () => {
    const result = await decryptCredentials("no-colon-here");
    expect(result).toBe("no-colon-here");
  });

  test("不明なプレフィックスの場合はエラーをスローする", async () => {
    await expect(decryptCredentials("unknown:data")).rejects.toThrow(
      '不明な暗号化プレフィックス: "unknown"',
    );
  });

  test("fallback プレフィックスの場合は復号を試みる", async () => {
    // 鍵ファイルが見つからない場合のエラーを検証
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    await expect(decryptCredentials("fallback:AAAA")).rejects.toThrow();
  });
});
