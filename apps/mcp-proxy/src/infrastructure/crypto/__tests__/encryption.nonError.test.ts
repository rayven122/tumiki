/**
 * encryption.ts の非Errorスロー時のブランチカバレッジテスト
 *
 * node:crypto の createDecipheriv をモックして、
 * decipher.final() が Error 以外の値をスローするケースをテストする。
 * ESMモジュールの制約により vi.spyOn が使えないため、
 * vi.mock で node:crypto を部分モックする独立テストファイルとして実装。
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCreateDecipheriv } = vi.hoisted(() => ({
  mockCreateDecipheriv: vi.fn(),
}));

// node:crypto を部分モック（createDecipheriv のみ差し替え）
vi.mock("node:crypto", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    createDecipheriv: mockCreateDecipheriv,
  };
});

import { decrypt, generateEncryptionKey } from "../encryption.js";

describe("decrypt 非Errorスロー時", () => {
  beforeEach(() => {
    vi.stubEnv("REDIS_ENCRYPTION_KEY", generateEncryptionKey());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("復号化中にError以外のオブジェクトがスローされた場合はUnknown errorメッセージを含む", () => {
    mockCreateDecipheriv.mockReturnValue({
      setAuthTag: vi.fn(),
      update: vi.fn().mockReturnValue(Buffer.from("")),
      final: vi.fn().mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- 非Errorスロー時のテスト
        throw "non-error-string";
      }),
    });

    // 有効なBase64の暗号文を作成（IV 12バイト + AuthTag 16バイト + 暗号文）
    const fakeEncrypted = Buffer.alloc(12 + 16 + 10).toString("base64");

    expect(() => decrypt(fakeEncrypted)).toThrow(
      "Decryption failed: Unknown error",
    );
  });
});
