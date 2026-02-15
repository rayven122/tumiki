import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { decrypt, encrypt } from "../index";

// 有効な32バイト（64文字の16進数）テスト用暗号化キー
const VALID_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * 暗号文の最後のバイトを改ざんする
 */
const tamperLastByte = (encrypted: string): string => {
  const buffer = Buffer.from(encrypted, "base64");
  const lastIndex = buffer.length - 1;
  const lastByte = buffer[lastIndex];
  if (lastByte !== undefined) {
    buffer[lastIndex] = lastByte ^ 0xff;
  }
  return buffer.toString("base64");
};

describe("crypto", () => {
  describe("encrypt / decrypt", () => {
    beforeAll(() => {
      vi.stubEnv("REDIS_ENCRYPTION_KEY", VALID_ENCRYPTION_KEY);
    });

    afterAll(() => {
      vi.unstubAllEnvs();
    });

    test("平文を暗号化し、復号化して元の平文に戻る", () => {
      const plaintext = "テスト用の秘密データ";

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test("空文字列を暗号化・復号化できる", () => {
      const plaintext = "";

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test("長い文字列を暗号化・復号化できる", () => {
      const plaintext = "a".repeat(10000);

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test("同じ平文でも暗号化の度に異なる暗号文を生成する（IVがランダム）", () => {
      const plaintext = "テストデータ";

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      // どちらも同じ平文に復号化できる
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    test("暗号文が改ざんされた場合、復号化に失敗する", () => {
      const plaintext = "テストデータ";
      const encrypted = encrypt(plaintext);
      const tampered = tamperLastByte(encrypted);

      expect(() => decrypt(tampered)).toThrow("Decryption failed");
    });
  });

  describe("環境変数バリデーション", () => {
    afterAll(() => {
      vi.unstubAllEnvs();
    });

    test("REDIS_ENCRYPTION_KEYが未設定の場合、エラーをスローする", () => {
      vi.stubEnv("REDIS_ENCRYPTION_KEY", "");

      expect(() => encrypt("test")).toThrow(
        "REDIS_ENCRYPTION_KEY environment variable is not set",
      );
    });

    test("キーが64文字未満の場合、エラーをスローする", () => {
      vi.stubEnv("REDIS_ENCRYPTION_KEY", "0123456789abcdef");

      expect(() => encrypt("test")).toThrow(
        "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
      );
    });

    test("キーに無効な文字が含まれる場合、エラーをスローする", () => {
      vi.stubEnv(
        "REDIS_ENCRYPTION_KEY",
        "ghijklmnopqrstuv0123456789abcdef0123456789abcdef0123456789abcdef",
      );

      expect(() => encrypt("test")).toThrow(
        "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
      );
    });

    test("キーが全て0の場合、エラーをスローする", () => {
      vi.stubEnv(
        "REDIS_ENCRYPTION_KEY",
        "0000000000000000000000000000000000000000000000000000000000000000",
      );

      expect(() => encrypt("test")).toThrow(
        "REDIS_ENCRYPTION_KEY cannot be all zeros",
      );
    });
  });

  describe("本番環境でのエラーメッセージ", () => {
    afterAll(() => {
      vi.unstubAllEnvs();
    });

    test("本番環境では復号化エラーの詳細を隠す", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("REDIS_ENCRYPTION_KEY", VALID_ENCRYPTION_KEY);

      // 正しい形式だが無効な暗号文（改ざんされたデータ）
      const plaintext = "テストデータ";
      const validEncrypted = encrypt(plaintext);
      const tampered = tamperLastByte(validEncrypted);

      expect(() => decrypt(tampered)).toThrow("Decryption failed");
      // 詳細なエラーメッセージが含まれていないことを確認
      try {
        decrypt(tampered);
      } catch (error) {
        expect((error as Error).message).toBe("Decryption failed");
        expect((error as Error).message).not.toContain(":");
      }
    });

    test("開発環境では復号化エラーの詳細を表示する", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("REDIS_ENCRYPTION_KEY", VALID_ENCRYPTION_KEY);

      // 正しい形式だが無効な暗号文（改ざんされたデータ）
      const plaintext = "テストデータ";
      const validEncrypted = encrypt(plaintext);
      const tampered = tamperLastByte(validEncrypted);

      expect(() => decrypt(tampered)).toThrow(/Decryption failed:/);
    });

    test("本番環境でも環境変数設定エラーは詳細を表示する（encrypt）", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("REDIS_ENCRYPTION_KEY", "");

      expect(() => encrypt("test")).toThrow(
        "REDIS_ENCRYPTION_KEY environment variable is not set",
      );
    });

    test("本番環境でも環境変数設定エラーは詳細を表示する（decrypt）", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("REDIS_ENCRYPTION_KEY", "invalid_key");

      expect(() => decrypt("dummydata")).toThrow(
        "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
      );
    });
  });
});
