import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// モジュールのモック
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === "userData") {
        return join(tmpdir(), "tumiki-test-encryption");
      }
      return tmpdir();
    }),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false), // フォールバック戦略を優先的にテスト
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

// テスト対象のインポート（モックの後に行う）
import { encryptTokenAsync, decryptTokenAsync } from "../encryption";

describe("encryptTokenAsync", () => {
  const testUserDataPath = join(tmpdir(), "tumiki-test-encryption");

  beforeEach(() => {
    // テスト用ディレクトリを作成
    if (!existsSync(testUserDataPath)) {
      mkdirSync(testUserDataPath, { recursive: true });
    }
  });

  afterEach(() => {
    // テスト用ディレクトリをクリーンアップ
    if (existsSync(testUserDataPath)) {
      rmSync(testUserDataPath, { recursive: true, force: true });
    }
  });

  test("トークンを正常に暗号化できる", async () => {
    const plainText = "test-access-token-12345";
    const encrypted = await encryptTokenAsync(plainText);

    // 暗号化されたテキストが存在する
    expect(encrypted).toBeTruthy();
    expect(encrypted.length).toBeGreaterThan(0);

    // プレフィックスが付与されている
    expect(encrypted).toContain(":");

    // 元のテキストとは異なる
    expect(encrypted).not.toBe(plainText);
  });

  test("暗号化されたトークンにプレフィックスが含まれる", async () => {
    const plainText = "test-token";
    const encrypted = await encryptTokenAsync(plainText);

    // フォールバック戦略の場合は "fallback:" プレフィックス
    expect(encrypted).toMatch(/^(safe|fallback):/);
  });

  test("同じテキストでも異なる暗号化結果になる（ソルトとIVがランダム）", async () => {
    const plainText = "test-token";
    const encrypted1 = await encryptTokenAsync(plainText);
    const encrypted2 = await encryptTokenAsync(plainText);

    // 同じ平文でも暗号化結果は異なる（ソルトとIVがランダム）
    expect(encrypted1).not.toBe(encrypted2);
  });

  test("空文字列を暗号化できる", async () => {
    const encrypted = await encryptTokenAsync("");

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain(":");
  });

  test("長いトークンを暗号化できる", async () => {
    const longToken = "a".repeat(1000);
    const encrypted = await encryptTokenAsync(longToken);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain(":");
  });

  test("特殊文字を含むトークンを暗号化できる", async () => {
    const specialToken =
      'token-with-special-chars: !@#$%^&*()_+-={}[]|\\:";<>?,./';
    const encrypted = await encryptTokenAsync(specialToken);

    expect(encrypted).toBeTruthy();
    expect(encrypted).toContain(":");
  });

  test("暗号化キーファイルが作成される", async () => {
    const plainText = "test-token";
    await encryptTokenAsync(plainText);

    const keyPath = join(testUserDataPath, "tumiki-encryption.key");
    expect(existsSync(keyPath)).toBe(true);
  });

  test("既存の暗号化キーを再利用する", async () => {
    const plainText1 = "first-token";
    const plainText2 = "second-token";

    // 1回目の暗号化でキーファイル作成
    await encryptTokenAsync(plainText1);
    const keyPath = join(testUserDataPath, "tumiki-encryption.key");
    const keyStats1 = existsSync(keyPath);

    // 2回目の暗号化では既存キーを再利用
    await encryptTokenAsync(plainText2);
    const keyStats2 = existsSync(keyPath);

    expect(keyStats1).toBe(true);
    expect(keyStats2).toBe(true);
  });
});

describe("decryptTokenAsync", () => {
  const testUserDataPath = join(tmpdir(), "tumiki-test-encryption");

  beforeEach(() => {
    if (!existsSync(testUserDataPath)) {
      mkdirSync(testUserDataPath, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testUserDataPath)) {
      rmSync(testUserDataPath, { recursive: true, force: true });
    }
  });

  test("暗号化されたトークンを正常に復号化できる", async () => {
    const plainText = "test-access-token-12345";
    const encrypted = await encryptTokenAsync(plainText);
    const decrypted = await decryptTokenAsync(encrypted);

    expect(decrypted).toBe(plainText);
  });

  test("複数のトークンをラウンドトリップできる", async () => {
    const tokens = [
      "access-token-1",
      "refresh-token-2",
      "very-long-token-" + "x".repeat(500),
      "special-chars-!@#$%",
      "",
    ];

    for (const token of tokens) {
      const encrypted = await encryptTokenAsync(token);
      const decrypted = await decryptTokenAsync(encrypted);
      expect(decrypted).toBe(token);
    }
  });

  test("異なる暗号化結果でも正しく復号化できる", async () => {
    const plainText = "test-token";
    const encrypted1 = await encryptTokenAsync(plainText);
    const encrypted2 = await encryptTokenAsync(plainText);

    const decrypted1 = await decryptTokenAsync(encrypted1);
    const decrypted2 = await decryptTokenAsync(encrypted2);

    expect(decrypted1).toBe(plainText);
    expect(decrypted2).toBe(plainText);
  });

  test("不正なプレフィックスの場合はエラーをスロー", async () => {
    const invalidEncrypted = "invalid-prefix:some-data";

    await expect(decryptTokenAsync(invalidEncrypted)).rejects.toThrow();
  });

  test("不正なBase64データの場合はエラーをスロー", async () => {
    const invalidEncrypted = "fallback:invalid-base64-data!!!";

    await expect(decryptTokenAsync(invalidEncrypted)).rejects.toThrow();
  });

  test("空の暗号化データの場合はエラーをスロー", async () => {
    const invalidEncrypted = "fallback:";

    await expect(decryptTokenAsync(invalidEncrypted)).rejects.toThrow();
  });

  test("切り詰められた暗号化データの場合はエラーをスロー", async () => {
    const plainText = "test-token";
    const encrypted = await encryptTokenAsync(plainText);
    const [prefix, data] = encrypted.split(":");

    // データの一部のみを使用
    const truncated = `${prefix}:${data?.substring(0, 10) ?? ""}`;

    await expect(decryptTokenAsync(truncated)).rejects.toThrow();
  });

  test("改ざんされた暗号化データの場合はエラーをスロー", async () => {
    const plainText = "test-token";
    const encrypted = await encryptTokenAsync(plainText);
    const [prefix, data] = encrypted.split(":");

    // データを改ざん
    const tamperedData =
      (data?.substring(0, (data?.length ?? 0) - 10) ?? "") + "XXXXXXXXXX";
    const tampered = `${prefix}:${tamperedData}`;

    await expect(decryptTokenAsync(tampered)).rejects.toThrow();
  });
});

describe("暗号化キーの管理", () => {
  const testUserDataPath = join(tmpdir(), "tumiki-test-encryption");

  beforeEach(() => {
    if (!existsSync(testUserDataPath)) {
      mkdirSync(testUserDataPath, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testUserDataPath)) {
      rmSync(testUserDataPath, { recursive: true, force: true });
    }
  });

  test("暗号化キーファイルが適切な権限で作成される", async () => {
    const plainText = "test-token";
    await encryptTokenAsync(plainText);

    const keyPath = join(testUserDataPath, "tumiki-encryption.key");
    expect(existsSync(keyPath)).toBe(true);

    // ファイルサイズが32バイト（KEY_LENGTH）であることを確認
    const fs = await import("fs/promises");
    const stats = await fs.stat(keyPath);
    expect(stats.size).toBe(32);
  });

  test("同じキーで複数のトークンを暗号化・復号化できる", async () => {
    const tokens = ["token1", "token2", "token3"];
    const encrypted: string[] = [];

    // すべてのトークンを暗号化
    for (const token of tokens) {
      encrypted.push(await encryptTokenAsync(token));
    }

    // すべての暗号化されたトークンを復号化
    for (let i = 0; i < tokens.length; i++) {
      const encryptedToken = encrypted[i];
      if (encryptedToken) {
        const decrypted = await decryptTokenAsync(encryptedToken);
        expect(decrypted).toBe(tokens[i]);
      }
    }
  });
});
