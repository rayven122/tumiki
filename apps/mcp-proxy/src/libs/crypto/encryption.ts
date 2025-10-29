import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * 暗号化アルゴリズム: AES-256-GCM（認証付き暗号化）
 */
const ALGORITHM = "aes-256-gcm";

/**
 * 初期化ベクトル（IV）のバイト長
 */
const IV_LENGTH = 12; // GCMモードでは12バイトが推奨

/**
 * 認証タグのバイト長
 */
const AUTH_TAG_LENGTH = 16;

/**
 * 環境変数から暗号化キーを取得
 * @returns 32バイトの暗号化キー
 * @throws 環境変数が未設定または不正な場合
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.CACHE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("CACHE_ENCRYPTION_KEY environment variable is not set");
  }

  // 入力検証: 64文字の16進数文字列かチェック
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "CACHE_ENCRYPTION_KEY must be a valid 64-character hex string",
    );
  }

  // 16進数文字列からBufferに変換
  const keyBuffer = Buffer.from(key, "hex");

  // セキュリティチェック: キーが全て0ではないことを確認
  if (keyBuffer.every((byte) => byte === 0)) {
    throw new Error("CACHE_ENCRYPTION_KEY cannot be all zeros");
  }

  return keyBuffer;
};

/**
 * データを暗号化
 * @param plaintext - 暗号化する平文データ
 * @returns 暗号化されたデータ（IV + 認証タグ + 暗号文を結合）
 */
export const encrypt = (plaintext: string): string => {
  const key = getEncryptionKey();

  // ランダムなIVを生成
  const iv = randomBytes(IV_LENGTH);

  // 暗号化器を作成
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // データを暗号化
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // 認証タグを取得
  const authTag = cipher.getAuthTag();

  // IV + 認証タグ + 暗号文を結合してBase64エンコード
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64");
};

/**
 * データを復号化
 * @param encryptedData - 暗号化されたデータ（Base64エンコード）
 * @returns 復号化された平文データ
 * @throws 復号化に失敗した場合
 */
export const decrypt = (encryptedData: string): string => {
  const key = getEncryptionKey();

  // Base64デコード
  const combined = Buffer.from(encryptedData, "base64");

  // IV、認証タグ、暗号文を分離
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // 復号化器を作成
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    // データを復号化
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * 新しい暗号化キーを生成（開発・テスト用）
 * @returns 64文字の16進数文字列
 */
export const generateEncryptionKey = (): string => {
  return randomBytes(32).toString("hex");
};
