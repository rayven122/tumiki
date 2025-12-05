import { safeStorage } from "electron";

/**
 * トークンを暗号化（Electron safeStorage使用）
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト
 */
export const encryptToken = (plainText: string): string => {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(
      "暗号化サービスが利用できません。プレーンテキストで保存されます。",
    );
    // プレーンテキスト保存へのフォールバック（Base64エンコードのみ）
    return Buffer.from(plainText, "utf8").toString("base64");
  }

  const encryptedBuffer = safeStorage.encryptString(plainText);
  return encryptedBuffer.toString("base64");
};

/**
 * トークンを復号化（Electron safeStorage使用）
 * @param encryptedText Base64エンコードされた暗号化テキスト
 * @returns 復号化された平文
 */
export const decryptToken = (encryptedText: string): string => {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(
      "暗号化サービスが利用できません。プレーンテキストとして復号化します。",
    );
    // プレーンテキストからの復号化（Base64デコードのみ）
    return Buffer.from(encryptedText, "base64").toString("utf8");
  }

  const encryptedBuffer = Buffer.from(encryptedText, "base64");
  return safeStorage.decryptString(encryptedBuffer);
};
