import { safeStorage } from "electron";

/**
 * トークンを暗号化（Electron safeStorage使用）
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト
 */
export const encryptToken = (plainText: string): string => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("暗号化が利用できません");
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
    throw new Error("復号化が利用できません");
  }

  const encryptedBuffer = Buffer.from(encryptedText, "base64");
  return safeStorage.decryptString(encryptedBuffer);
};
