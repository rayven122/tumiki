import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { decrypt, encrypt, generateEncryptionKey } from "../encryption.js";

beforeEach(() => {
  vi.stubEnv("REDIS_ENCRYPTION_KEY", generateEncryptionKey());
});

afterEach(() => {
  vi.unstubAllEnvs();
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

    expect(typeof encrypted).toBe("string");
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
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);
  });

  test("日本語文字列を暗号化できる", () => {
    const plaintext = "こんにちは、世界！";
    const encrypted = encrypt(plaintext);
    expect(typeof encrypted).toBe("string");
  });

  test("長い文字列を暗号化できる", () => {
    const plaintext = "a".repeat(10000);
    const encrypted = encrypt(plaintext);
    expect(typeof encrypted).toBe("string");
  });

  test("JSON文字列を暗号化できる", () => {
    const data = {
      apiKey: "secret-key-12345",
      token: "bearer-token-xyz",
      config: { nested: { value: 123 } },
    };
    const plaintext = JSON.stringify(data);
    const encrypted = encrypt(plaintext);
    expect(typeof encrypted).toBe("string");
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

describe("decrypt non-Error throw handling", () => {
  test("非Errorオブジェクトがスローされた場合はUnknown errorメッセージを返す", async () => {
    const encrypted = encrypt("test data");

    vi.resetModules();

    const actualCrypto =
      await vi.importActual<typeof import("node:crypto")>("node:crypto");

    vi.doMock("node:crypto", () => ({
      ...actualCrypto,
      createDecipheriv: (
        ...args: Parameters<typeof actualCrypto.createDecipheriv>
      ) => {
        const decipher = actualCrypto.createDecipheriv(...args);
        const originalUpdate = decipher.update.bind(decipher);
        decipher.update = (() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "non-error-string-thrown";
        }) as typeof decipher.update;
        void originalUpdate;
        return decipher;
      },
    }));

    vi.stubEnv("REDIS_ENCRYPTION_KEY", process.env.REDIS_ENCRYPTION_KEY);

    const { decrypt: decryptMocked } = await import("../encryption.js");

    expect(() => decryptMocked(encrypted)).toThrow(
      "Decryption failed: Unknown error",
    );

    vi.resetModules();
  });
});

describe("getEncryptionKey error handling", () => {
  test("環境変数が未設定の場合にエラーをスローする", () => {
    vi.unstubAllEnvs();

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY environment variable is not set",
    );
  });

  test("環境変数のキーが32バイトでない場合にエラーをスローする", () => {
    // 16バイト（32文字）のキーを設定
    vi.stubEnv("REDIS_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef");

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );
  });

  test("環境変数のキーが不正な16進数の場合にエラーをスローする", () => {
    // 64文字だが16進数でない
    vi.stubEnv(
      "REDIS_ENCRYPTION_KEY",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    );

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );
  });

  test("全てゼロのキーの場合にエラーをスローする", () => {
    vi.stubEnv("REDIS_ENCRYPTION_KEY", "0".repeat(64));

    expect(() => encrypt("test")).toThrow(
      "REDIS_ENCRYPTION_KEY cannot be all zeros",
    );
  });
});
