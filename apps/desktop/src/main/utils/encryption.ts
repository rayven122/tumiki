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
 * ファイル権限を検証
 * @param filePath ファイルパス
 * @param expectedPermissions 期待されるパーミッション（8進数文字列）
 * @throws {Error} 権限が一致しない場合
 */
const validateFilePermissions = (
  filePath: string,
  expectedPermissions: string,
): void => {
  try {
    const stats = statSync(filePath);
    const permissions = stats.mode & parseInt("777", 8);
    const expected = parseInt(expectedPermissions, 8);

    if (permissions !== expected) {
      throw new Error(
        `File has unsafe permissions: ${permissions.toString(8)}. Expected: ${expectedPermissions}. Path: ${filePath}`,
      );
    }

    // ファイルサイズの検証（キーファイルは正確にKEY_LENGTHバイトであるべき）
    if (stats.size !== KEY_LENGTH) {
      throw new Error(
        `Encryption key file has invalid size: ${stats.size} bytes. Expected: ${KEY_LENGTH} bytes`,
      );
    }
  } catch (error) {
    // ENOENT エラーの場合は再スロー（ファイルが存在しない）
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw error;
    }

    // その他のエラー（権限エラーなど）も再スロー
    throw error;
  }
};

/**
 * 暗号化キーを取得または生成
 * safeStorageが利用できない環境用のフォールバック機能
 */
const getOrCreateEncryptionKey = (): Buffer => {
  const userDataPath = app.getPath("userData");
  const keyPath = join(userDataPath, ".encryption-key");

  // 既存のキーファイルが存在する場合は読み込む
  if (existsSync(keyPath)) {
    try {
      // ファイル権限とサイズの検証
      validateFilePermissions(keyPath, "600");

      // キーファイルを読み込み
      return readFileSync(keyPath);
    } catch (error) {
      // ENOENT エラーの場合は新規作成フローに進む
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // ファイルが存在しない場合は新規作成フローに進む
      } else {
        // セキュリティエラーは致命的なのでログに記録して再スロー
        console.error("Encryption key validation failed:", error);
        throw error;
      }
    }
  }

  // 新しいキーを生成して保存
  const key = randomBytes(KEY_LENGTH);

  // userDataディレクトリが存在しない場合は作成（所有者のみアクセス可能）
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true, mode: 0o700 });

    // ディレクトリ権限の検証
    const dirStats = statSync(userDataPath);
    const dirPermissions = dirStats.mode & parseInt("777", 8);
    if (dirPermissions !== parseInt("700", 8)) {
      throw new Error(
        `User data directory has unsafe permissions: ${dirPermissions.toString(8)}. Expected: 700`,
      );
    }
  }

  // キーファイルを保存（所有者のみ読み書き可能）
  writeFileSync(keyPath, key, { mode: 0o600 });

  // ファイル権限とサイズの検証
  validateFilePermissions(keyPath, "600");

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
