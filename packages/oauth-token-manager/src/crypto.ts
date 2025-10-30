/**
 * 暗号化/復号化ユーティリティ
 *
 * AES-256-GCMを使用したトークンデータの暗号化・復号化
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { logger } from "./logger.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 暗号化キーを取得
 *
 * @returns 暗号化キー（32バイト）
 * @throws 環境変数が設定されていない場合
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.REDIS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("REDIS_ENCRYPTION_KEY environment variable is not set");
  }

  // キーが32バイト（64文字の16進数文字列）であることを確認
  if (key.length !== 64) {
    throw new Error(
      "REDIS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    );
  }

  return Buffer.from(key, "hex");
};

/**
 * データを暗号化
 *
 * @param plaintext 平文データ
 * @returns 暗号化されたデータ（Base64エンコード）
 */
export const encrypt = (plaintext: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(salt);

    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // IV + salt + authTag + 暗号化データを結合
    const combined = Buffer.concat([
      iv,
      salt,
      authTag,
      Buffer.from(encrypted, "base64"),
    ]);

    return combined.toString("base64");
  } catch (error) {
    logger.error("Encryption failed", { error });
    throw new Error("Failed to encrypt data");
  }
};

/**
 * データを復号化
 *
 * @param encryptedData 暗号化されたデータ（Base64エンコード）
 * @returns 平文データ
 */
export const decrypt = (encryptedData: string): string => {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, "base64");

    // IV、salt、authTag、暗号化データを分離
    const iv = combined.subarray(0, IV_LENGTH);
    const salt = combined.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const authTag = combined.subarray(
      IV_LENGTH + SALT_LENGTH,
      IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH,
    );
    const encrypted = combined.subarray(
      IV_LENGTH + SALT_LENGTH + AUTH_TAG_LENGTH,
    );

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(salt);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(
      encrypted.toString("base64"),
      "base64",
      "utf8",
    );
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error("Decryption failed", { error });
    throw new Error("Failed to decrypt data");
  }
};
