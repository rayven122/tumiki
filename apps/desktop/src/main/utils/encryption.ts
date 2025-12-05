import { safeStorage } from "electron";

/**
 * トークンを暗号化（Electron safeStorage使用）
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト
 */
export const encryptToken = (plainText: string): string => {
  // 暗号化が利用できない場合はエラーをスロー（セキュリティリスクを回避）
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "暗号化サービスが利用できない環境では認証トークンを保存できません。" +
        "この環境ではElectron safeStorageが利用できません。",
    );
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
  // 暗号化が利用できない場合はエラーをスロー（セキュリティリスクを回避）
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "暗号化サービスが利用できない環境では認証トークンを復号化できません。" +
        "この環境ではElectron safeStorageが利用できません。",
    );
  }

  const encryptedBuffer = Buffer.from(encryptedText, "base64");
  return safeStorage.decryptString(encryptedBuffer);
};
