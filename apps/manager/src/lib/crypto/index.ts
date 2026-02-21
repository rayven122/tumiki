/**
 * 暗号化ユーティリティ
 *
 * AES-256-GCMを使用した暗号化・復号化機能を提供
 * mcp-proxyと同じ暗号化キー（REDIS_ENCRYPTION_KEY）を使用
 */

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
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.REDIS_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("REDIS_ENCRYPTION_KEY environment variable is not set");
  }

  // 入力検証: 64文字の16進数文字列かチェック
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "REDIS_ENCRYPTION_KEY must be 32 bytes (64 hex characters)",
    );
  }

  // 16進数文字列からBufferに変換
  const keyBuffer = Buffer.from(key, "hex");

  // セキュリティチェック: キーが全て0ではないことを確認
  if (keyBuffer.every((byte) => byte === 0)) {
    throw new Error("REDIS_ENCRYPTION_KEY cannot be all zeros");
  }

  return keyBuffer;
};

/**
 * 本番環境かどうかを判定
 */
const isProduction = (): boolean => process.env.NODE_ENV === "production";

/**
 * 環境変数設定エラーかどうかを判定
 * 設定エラーは開発者が修正する必要があるため、常に詳細を表示する
 */
const isConfigurationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("REDIS_ENCRYPTION_KEY");
};

/**
 * データを暗号化
 */
export const encrypt = (plaintext: string): string => {
  try {
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
  } catch (error) {
    // 環境変数設定エラーは常に詳細を表示（開発者が修正する必要があるため）
    if (isConfigurationError(error)) {
      throw error;
    }
    // 本番環境では詳細なエラー情報を隠す（暗号化の実装情報漏洩防止）
    if (isProduction()) {
      throw new Error("Encryption failed");
    }
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * データを復号化
 */
export const decrypt = (encryptedData: string): string => {
  try {
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

    // データを復号化
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    // 環境変数設定エラーは常に詳細を表示（開発者が修正する必要があるため）
    if (isConfigurationError(error)) {
      throw error;
    }
    // 本番環境では詳細なエラー情報を隠す（暗号化の実装情報漏洩防止）
    if (isProduction()) {
      throw new Error("Decryption failed");
    }
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
