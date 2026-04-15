/**
 * Electron非依存の認証情報復号モジュール
 * Desktop側の encryption.ts と同じ fallback 暗号化方式（AES-256-GCM + ファイルベース鍵）を使用。
 */
import { createDecipheriv, scrypt } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { resolveUserDataPath } from "../shared/user-data-path";

const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Desktop側の encryption.ts と同一のscryptパラメータ
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;

const scryptAsync = (
  password: Buffer,
  salt: Buffer,
  keylen: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

// TODO: encryption.ts の cachedEncryptionKey と同一ファイルを参照しており二重管理になっている。
// 将来的に shared/ へキー読み込み処理を共通化し、キーローテーション時の不整合を防ぐ。
let cachedKey: Buffer | null = null;

const getEncryptionKey = async (): Promise<Buffer> => {
  if (cachedKey) return cachedKey;
  const keyPath = join(resolveUserDataPath(), "tumiki-encryption.key");

  let key: Buffer;
  try {
    key = await readFile(keyPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : undefined;
    if (code === "ENOENT") {
      throw new Error(
        `暗号化キーファイルが見つかりません: ${keyPath}\n` +
          "Desktopアプリを一度起動してキーを生成してください。",
      );
    }
    throw error;
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `暗号化キーファイルのサイズが不正です: ${key.length}バイト（期待値: ${KEY_LENGTH}バイト）`,
    );
  }

  cachedKey = key;
  return key;
};

const decryptFallback = async (encryptedBase64: string): Promise<string> => {
  const data = Buffer.from(encryptedBase64, "base64");
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const masterKey = await getEncryptionKey();
  const key = await scryptAsync(masterKey, salt, KEY_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
};

/**
 * 暗号化された認証情報を復号する
 * - "fallback:..." → ファイルベース鍵で復号
 * - プレフィックスなし → プレーンテキスト（後方互換）
 */
export const decryptCredentials = async (
  encrypted: string,
): Promise<string> => {
  if (!encrypted) return "{}";

  const sepIdx = encrypted.indexOf(":");
  if (sepIdx <= 0) return encrypted;

  const prefix = encrypted.substring(0, sepIdx);
  const data = encrypted.substring(sepIdx + 1);

  if (prefix === "fallback") {
    return decryptFallback(data);
  }

  if (prefix === "safe") {
    throw new Error(
      "safe: prefix で暗号化されたデータはCLIから復号できません。\n" +
        "Desktopアプリで認証情報を再登録してください。",
    );
  }

  throw new Error(
    `不明な暗号化プレフィックス: "${prefix}"（"fallback" のみ対応）`,
  );
};

/**
 * 暗号化キーのメモリキャッシュをクリア
 * @internal テスト専用。プロダクションコードからの呼び出し禁止。
 */
export const _resetDecryptorKeyCache = (): void => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("_resetDecryptorKeyCache はテスト環境でのみ使用できます");
  }
  cachedKey = null;
};
