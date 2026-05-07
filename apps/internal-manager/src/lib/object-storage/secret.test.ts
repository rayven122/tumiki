import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  decryptObjectStorageSecret,
  encryptObjectStorageSecret,
} from "./secret";

const testEncryptionKey = "0123456789abcdefghijklmnopqrstuvwxyz";

beforeEach(() => {
  vi.stubEnv("OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY", testEncryptionKey);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("Object Storage Secretを暗号化して復号できる", () => {
  const encrypted = encryptObjectStorageSecret("minioadmin");

  expect(encrypted).not.toStrictEqual("minioadmin");
  expect(encrypted.startsWith("enc:v1:")).toStrictEqual(true);
  expect(decryptObjectStorageSecret(encrypted)).toStrictEqual("minioadmin");
});

test("既存の平文値は後方互換としてそのまま返す", () => {
  expect(decryptObjectStorageSecret("legacy-secret")).toStrictEqual(
    "legacy-secret",
  );
});

test("暗号化キーが未設定の場合はエラーをスローする", () => {
  vi.unstubAllEnvs();

  expect(() => encryptObjectStorageSecret("minioadmin")).toThrow(
    "OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY must be at least 32 characters long",
  );
});

test("暗号化キーが32文字未満の場合はエラーをスローする", () => {
  vi.stubEnv("OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY", "short");

  expect(() => encryptObjectStorageSecret("minioadmin")).toThrow(
    "OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY must be at least 32 characters long",
  );
});

test("不正な暗号化フォーマットの場合はエラーをスローする", () => {
  expect(() => decryptObjectStorageSecret("enc:v1:invalid")).toThrow(
    "Invalid encrypted object storage secret",
  );
});

test("暗号化キーが変更された場合はキャッシュを更新する", () => {
  const firstEncrypted = encryptObjectStorageSecret("first-secret");
  expect(decryptObjectStorageSecret(firstEncrypted)).toStrictEqual(
    "first-secret",
  );

  vi.stubEnv(
    "OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY",
    "abcdefghijklmnopqrstuvwxyz0123456789",
  );
  const secondEncrypted = encryptObjectStorageSecret("second-secret");

  expect(decryptObjectStorageSecret(secondEncrypted)).toStrictEqual(
    "second-secret",
  );
});
