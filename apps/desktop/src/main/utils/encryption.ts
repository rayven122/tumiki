import { safeStorage, app } from "electron";
import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "crypto";
import { join } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "fs";

// フォールバック暗号化用の定数
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * 暗号化キーを取得または生成
 * safeStorageが利用できない環境用のフォールバック機能
 */
const getOrCreateEncryptionKey = (): Buffer => {
  const userDataPath = app.getPath("userData");
  const keyPath = join(userDataPath, ".encryption-key");

  // 既存のキーファイルが存在する場合は読み込む
  if (existsSync(keyPath)) {
    // ファイル権限の検証
    const stats = statSync(keyPath);
    if ((stats.mode & parseInt("077", 8)) !== 0) {
      throw new Error("Encryption key file has unsafe permissions");
    }
    return readFileSync(keyPath);
  }

  // 新しいキーを生成して保存
  const key = randomBytes(KEY_LENGTH);

  // userDataディレクトリが存在しない場合は作成（所有者のみアクセス可能）
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true, mode: 0o700 });
  }

  // キーファイルを保存（所有者のみ読み書き可能）
  writeFileSync(keyPath, key, { mode: 0o600 });

  // ファイル権限の検証
  const stats = statSync(keyPath);
  if ((stats.mode & parseInt("077", 8)) !== 0) {
    throw new Error("Encryption key file has unsafe permissions");
  }

  return key;
};

/**
 * Node.js cryptoを使用したフォールバック暗号化
 */
const fallbackEncrypt = (plainText: string): string => {
  // ソルトとIVを生成
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // キーを取得
  const masterKey = getOrCreateEncryptionKey();

  // scryptで鍵を導出
  const key = scryptSync(masterKey, salt, KEY_LENGTH);

  // 暗号化
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  // 認証タグを取得
  const authTag = cipher.getAuthTag();

  // salt + iv + authTag + encrypted を結合
  const result = Buffer.concat([salt, iv, authTag, encrypted]);
  return result.toString("base64");
};

/**
 * Node.js cryptoを使用したフォールバック復号化
 */
const fallbackDecrypt = (encryptedText: string): string => {
  const data = Buffer.from(encryptedText, "base64");

  // salt, iv, authTag, encrypted を分離
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // キーを取得
  const masterKey = getOrCreateEncryptionKey();

  // scryptで鍵を導出
  const key = scryptSync(masterKey, salt, KEY_LENGTH);

  // 復号化
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

/**
 * トークンを暗号化
 * Electron safeStorageが利用可能な場合はそれを使用し、
 * 利用できない場合はNode.js cryptoによるフォールバック暗号化を使用
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト（プレフィックス付き）
 */
export const encryptToken = (plainText: string): string => {
  if (safeStorage.isEncryptionAvailable()) {
    // safeStorageが利用可能な場合
    const encryptedBuffer = safeStorage.encryptString(plainText);
    // プレフィックスを付けて暗号化方式を識別
    return `safe:${encryptedBuffer.toString("base64")}`;
  } else {
    // フォールバック暗号化を使用
    const encrypted = fallbackEncrypt(plainText);
    // プレフィックスを付けて暗号化方式を識別
    return `fallback:${encrypted}`;
  }
};

/**
 * トークンを復号化
 * 暗号化方式のプレフィックスに基づいて適切な復号化方法を使用
 * @param encryptedText Base64エンコードされた暗号化テキスト（プレフィックス付き）
 * @returns 復号化された平文
 */
export const decryptToken = (encryptedText: string): string => {
  // プレフィックスをチェック
  if (encryptedText.startsWith("safe:")) {
    // safeStorageで暗号化されたデータ
    const data = encryptedText.slice(5); // "safe:" を除去
    const encryptedBuffer = Buffer.from(data, "base64");
    return safeStorage.decryptString(encryptedBuffer);
  } else if (encryptedText.startsWith("fallback:")) {
    // フォールバック暗号化されたデータ
    const data = encryptedText.slice(9); // "fallback:" を除去
    return fallbackDecrypt(data);
  } else {
    // 古い形式（プレフィックスなし）のサポート
    // safeStorageで試してみる
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = Buffer.from(encryptedText, "base64");
        return safeStorage.decryptString(encryptedBuffer);
      }
    } catch {
      // safeStorageで失敗した場合はフォールバックを試す
    }
    return fallbackDecrypt(encryptedText);
  }
};
