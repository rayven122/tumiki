/**
 * 暗号化・復号化の Property-Based Testing
 *
 * テストするプロパティ:
 * - ラウンドトリップ: decrypt(encrypt(x)) === x
 * - 暗号化の非決定性: 同じ平文でも異なる暗号文を生成
 * - 暗号文の形式: 常にBase64形式
 * - Unicode文字列の正しい処理
 */

import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import * as fc from "fast-check";
import { encrypt, decrypt, generateEncryptionKey } from "../encryption.js";
import {
  plaintextArbitrary,
  unicodePlaintextArbitrary,
} from "../../../test-utils/arbitraries.js";

describe("encryption", () => {
  beforeAll(() => {
    // テスト用の有効なキーを設定
    vi.stubEnv("REDIS_ENCRYPTION_KEY", generateEncryptionKey());
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  describe("encrypt / decrypt", () => {
    test("ラウンドトリップ: 任意の文字列を暗号化して復号化すると元の文字列に戻る", () => {
      fc.assert(
        fc.property(plaintextArbitrary, (plaintext) => {
          const encrypted = encrypt(plaintext);
          const decrypted = decrypt(encrypted);
          expect(decrypted).toStrictEqual(plaintext);
        }),
        { numRuns: 100 },
      );
    });

    test("ラウンドトリップ: Unicode文字列（絵文字、CJK文字）を正しく処理する", () => {
      fc.assert(
        fc.property(unicodePlaintextArbitrary, (plaintext) => {
          const encrypted = encrypt(plaintext);
          const decrypted = decrypt(encrypted);
          expect(decrypted).toStrictEqual(plaintext);
        }),
        { numRuns: 100 },
      );
    });

    test("ラウンドトリップ: 空文字列を正しく処理する", () => {
      const encrypted = encrypt("");
      const decrypted = decrypt(encrypted);
      expect(decrypted).toStrictEqual("");
    });

    test("非決定性: 同じ平文を複数回暗号化すると異なる暗号文が生成される", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (plaintext) => {
          const encrypted1 = encrypt(plaintext);
          const encrypted2 = encrypt(plaintext);
          // IV がランダムなので、同じ平文でも異なる暗号文になる
          expect(encrypted1).not.toStrictEqual(encrypted2);
          // 両方とも正しく復号化できる
          expect(decrypt(encrypted1)).toStrictEqual(plaintext);
          expect(decrypt(encrypted2)).toStrictEqual(plaintext);
        }),
        { numRuns: 50 },
      );
    });

    test("Base64形式: 暗号文は常に有効なBase64文字列", () => {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

      fc.assert(
        fc.property(plaintextArbitrary, (plaintext) => {
          const encrypted = encrypt(plaintext);
          expect(encrypted).toMatch(base64Regex);
          // Base64デコードが成功すること
          expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    test("暗号文の長さ: 平文の長さに応じた最小長を持つ", () => {
      // IV (12バイト) + AuthTag (16バイト) = 28バイト最小
      // Base64エンコードで約4/3倍になる
      const minOverheadBytes = 12 + 16; // IV + AuthTag

      fc.assert(
        fc.property(plaintextArbitrary, (plaintext) => {
          const encrypted = encrypt(plaintext);
          const encryptedBytes = Buffer.from(encrypted, "base64");
          // 暗号文のバイト長は平文のバイト長 + オーバーヘッド以上
          const plaintextBytes = Buffer.from(plaintext, "utf8").length;
          expect(encryptedBytes.length).toBeGreaterThanOrEqual(
            plaintextBytes + minOverheadBytes,
          );
        }),
        { numRuns: 100 },
      );
    });

    test("特殊文字: JSON特殊文字を含む文字列を正しく処理する", () => {
      const specialStrings = [
        '{"key": "value"}',
        'quote: "hello"',
        "newline:\n\ttab",
        "backslash: \\path\\to\\file",
        "unicode: \u0000\u001f",
        "null char: \0",
      ];

      specialStrings.forEach((str) => {
        const encrypted = encrypt(str);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toStrictEqual(str);
      });
    });

    test("大きな文字列: 大きな文字列も正しく処理できる", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10000, maxLength: 50000 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toStrictEqual(plaintext);
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe("decrypt", () => {
    test("改ざん検出: 暗号文を改ざんすると復号化に失敗する", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 100 }),
          (plaintext, position) => {
            const encrypted = encrypt(plaintext);
            const bytes = Buffer.from(encrypted, "base64");

            // 改ざん位置を決定（バイト配列の範囲内）
            const tamperedPosition = position % bytes.length;

            // 1ビット反転して改ざん
            bytes[tamperedPosition] = bytes[tamperedPosition] ^ 0x01;
            const tampered = bytes.toString("base64");

            // 改ざんされた暗号文は復号化に失敗する
            expect(() => decrypt(tampered)).toThrow();
          },
        ),
        { numRuns: 50 },
      );
    });

    test("無効なBase64: 無効なBase64文字列は復号化に失敗する", () => {
      const invalidBase64Strings = ["not-valid-base64!!!", "あいうえお", "   "];

      invalidBase64Strings.forEach((invalid) => {
        expect(() => decrypt(invalid)).toThrow();
      });
    });

    test("短すぎる暗号文: 最小長未満の暗号文は復号化に失敗する", () => {
      // IV (12) + AuthTag (16) = 28バイト未満は無効
      const shortData = Buffer.alloc(20).toString("base64");
      expect(() => decrypt(shortData)).toThrow();
    });
  });

  describe("generateEncryptionKey", () => {
    test("キー形式: 生成されるキーは64文字の16進数文字列", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key = generateEncryptionKey();
          expect(key).toMatch(/^[0-9a-f]{64}$/);
        }),
        { numRuns: 20 },
      );
    });

    test("キーの一意性: 生成されるキーは毎回異なる", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptionKey());
      }
      // 100回生成して全て異なることを確認
      expect(keys.size).toStrictEqual(100);
    });

    test("キーの使用可能性: 生成されたキーで暗号化・復号化ができる", () => {
      fc.assert(
        fc.property(plaintextArbitrary, (plaintext) => {
          // 新しいキーを生成して設定
          const newKey = generateEncryptionKey();
          vi.stubEnv("REDIS_ENCRYPTION_KEY", newKey);

          const encrypted = encrypt(plaintext);
          const decrypted = decrypt(encrypted);
          expect(decrypted).toStrictEqual(plaintext);
        }),
        { numRuns: 20 },
      );
    });
  });
});
