import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { decrypt, encrypt, generateEncryptionKey } from "./encryption.js";

// テスト用の暗号化キーを保存
let originalKey: string | undefined;

// テスト用の暗号化キーを環境変数に設定
beforeAll(() => {
  originalKey = process.env.REDIS_ENCRYPTION_KEY;
  process.env.REDIS_ENCRYPTION_KEY = generateEncryptionKey();
});

// テスト後に環境変数を元に戻す
afterEach(() => {
  if (originalKey !== undefined) {
    process.env.REDIS_ENCRYPTION_KEY = originalKey;
  }
});

describe("generateEncryptionKey", () => {
  test("64文字の16進数文字列を生成する", () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  test("毎回異なるキーを生成する", () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toStrictEqual(key2);
  });
});

describe("encrypt", () => {
  test("文字列を暗号化してBase64文字列を返す", () => {
    const plaintext = "Hello, World!";
    const encrypted = encrypt(plaintext);

    expect(typeof encrypted).toStrictEqual("string");
    expect(encrypted).not.toStrictEqual(plaintext);
    // Base64文字列であることを確認
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  test("同じ平文でも毎回異なる暗号文を生成する（IV がランダム）", () => {
    const plaintext = "Test data";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    expect(encrypted1).not.toStrictEqual(encrypted2);
  });

  test("空文字列を暗号化できる", () => {
    const encrypted = encrypt("");
    expect(typeof encrypted).toStrictEqual("string");
    expect(encrypted.length).toBeGreaterThan(0);
  });

  test("日本語文字列を暗号化できる", () => {
    const plaintext = "こんにちは、世界！";
    const encrypted = encrypt(plaintext);
    expect(typeof encrypted).toStrictEqual("string");
  });

  test("長い文字列を暗号化できる", () => {
    const plaintext = "a".repeat(10000);
    const encrypted = encrypt(plaintext);
    expect(typeof encrypted).toStrictEqual("string");
  });

  test("JSON文字列を暗号化できる", () => {
    const data = {
      apiKey: "secret-key-12345",
      token: "bearer-token-xyz",
      config: { nested: { value: 123 } },
    };
    const plaintext = JSON.stringify(data);
    const encrypted = encrypt(plaintext);
    expect(typeof encrypted).toStrictEqual("string");
  });
});

describe("decrypt", () => {
  test("暗号化されたデータを正しく復号化する", () => {
    const plaintext = "Hello, World!";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toStrictEqual(plaintext);
  });

  test("空文字列を正しく復号化する", () => {
    const plaintext = "";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toStrictEqual(plaintext);
  });

  test("日本語文字列を正しく復号化する", () => {
    const plaintext = "こんにちは、世界！";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toStrictEqual(plaintext);
  });

  test("長い文字列を正しく復号化する", () => {
    const plaintext = "a".repeat(10000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toStrictEqual(plaintext);
  });

  test("JSON文字列を正しく復号化する", () => {
    const data = {
      apiKey: "secret-key-12345",
      token: "bearer-token-xyz",
      config: { nested: { value: 123 } },
    };
    const plaintext = JSON.stringify(data);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toStrictEqual(plaintext);
    expect(JSON.parse(decrypted)).toStrictEqual(data);
  });

  test("不正なBase64文字列で復号化に失敗する", () => {
    expect(() => decrypt("invalid-base64!!!")).toThrow();
  });

  test("改ざんされたデータで復号化に失敗する", () => {
    const plaintext = "Hello, World!";
    const encrypted = encrypt(plaintext);

    // 暗号文を改ざん
    const tampered = encrypted.slice(0, -4) + "AAAA";

    expect(() => decrypt(tampered)).toThrow("Decryption failed");
  });

  test("短すぎるデータで復号化に失敗する", () => {
    expect(() => decrypt("YWJj")).toThrow();
  });
});

describe("encrypt and decrypt integration", () => {
  test("複数回の暗号化・復号化でデータが保持される", () => {
    const original = "Test data 123";

    // 1回目
    const encrypted1 = encrypt(original);
    const decrypted1 = decrypt(encrypted1);
    expect(decrypted1).toStrictEqual(original);

    // 2回目（異なる暗号文）
    const encrypted2 = encrypt(decrypted1);
    const decrypted2 = decrypt(encrypted2);
    expect(decrypted2).toStrictEqual(original);

    // 暗号文は異なる
    expect(encrypted1).not.toStrictEqual(encrypted2);
  });

  test("実際のキャッシュデータの暗号化・復号化", () => {
    const cacheData = [
      {
        namespace: "user-123/server-1",
        config: {
          name: "Test Server",
          transport: {
            type: "stdio" as const,
            command: "node",
            args: ["server.js"],
            envVars: {
              API_KEY: "secret-key-12345",
              TOKEN: "bearer-token-xyz",
            },
          },
        },
      },
    ];

    const plaintext = JSON.stringify(cacheData);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(decrypted);

    expect(parsed).toStrictEqual(cacheData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(parsed[0]?.config.transport.envVars?.API_KEY).toStrictEqual(
      "secret-key-12345",
    );
  });
});

describe("getEncryptionKey error handling", () => {
  test("環境変数が未設定の場合にエラーをスローする", () => {
    const originalKey = process.env.REDIS_ENCRYPTION_KEY;
    delete process.env.REDIS_ENCRYPTION_KEY;

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY environment variable is not set",
    );

    // 復元
    process.env.REDIS_ENCRYPTION_KEY = originalKey;
  });

  test("環境変数のキーが32バイトでない場合にエラーをスローする", () => {
    const originalKey = process.env.REDIS_ENCRYPTION_KEY;
    // 16バイト（32文字）のキーを設定
    process.env.REDIS_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );

    // 復元
    process.env.REDIS_ENCRYPTION_KEY = originalKey;
  });

  test("環境変数のキーが不正な16進数の場合にエラーをスローする", () => {
    const originalKey = process.env.REDIS_ENCRYPTION_KEY;
    // 64文字だが16進数でない
    process.env.REDIS_ENCRYPTION_KEY =
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );

    // 復元
    process.env.REDIS_ENCRYPTION_KEY = originalKey;
  });
});
