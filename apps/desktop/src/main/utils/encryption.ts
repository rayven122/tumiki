import { safeStorage, app } from "electron";
import { randomBytes, createCipheriv, createDecipheriv, scrypt } from "crypto";
import { promisify } from "util";
import { join } from "path";
import { existsSync } from "fs";
import {
  readFile,
  writeFile,
  mkdir,
  stat,
  rename,
  unlink,
  access,
  constants as fsPromiseConstants,
} from "fs/promises";
import * as logger from "./logger";

// フォールバック暗号化用の定数
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

// 暗号化戦略のプレフィックス定数
const ENCRYPTION_PREFIX = {
  SAFE_STORAGE: "safe",
  FALLBACK: "fallback",
} as const;

// scryptの非同期版
const scryptAsync = promisify(scrypt);

/**
 * 暗号化戦略の型
 */
type EncryptionStrategy = {
  encrypt: (plainText: string) => Promise<string>;
  decrypt: (encryptedText: string) => Promise<string>;
  isAvailable: () => boolean;
  getPrefix: () => string;
};

/**
 * キーファイルの整合性を検証
 * @param key キーデータ
 * @returns 有効なキーの場合true
 */
const isValidEncryptionKey = (key: Buffer): boolean => {
  if (key.length !== KEY_LENGTH) {
    return false;
  }

  // 全バイトが同じ値でないかチェック（ゼロ埋め・無効なキーを除外）
  const firstByte = key[0];
  if (key.every((byte) => byte === firstByte)) {
    return false;
  }

  return true;
};

/**
 * ファイル権限を検証
 * @param filePath ファイルパス
 * @param expectedPermissions 期待されるパーミッション（8進数文字列）- Unix系のみ
 * @throws {Error} 権限が一致しない場合
 */
const validateFilePermissions = async (
  filePath: string,
  expectedPermissions: string,
): Promise<void> => {
  const stats = await stat(filePath);

  if (process.platform === "win32") {
    // Windows環境でのセキュリティチェック
    // NTFS ACLの完全な検証はNode.jsでは困難だが、基本的なアクセス制御を確認
    try {
      await access(filePath, fsPromiseConstants.R_OK | fsPromiseConstants.W_OK);
    } catch {
      throw new Error(
        `Insufficient file access permissions on Windows. Path: ${filePath}`,
      );
    }

    // ファイルがユーザーデータディレクトリ内にあることを確認
    const userDataPath = app.getPath("userData");
    if (!filePath.startsWith(userDataPath)) {
      throw new Error(
        `Encryption key file must be in user data directory for security. Path: ${filePath}`,
      );
    }

    logger.debug("Windows security check passed for encryption key file", {
      path: filePath,
      userDataPath,
    });
  } else {
    // Unix系環境での権限チェック
    const permissions = stats.mode & parseInt("777", 8);
    const expected = parseInt(expectedPermissions, 8);

    if (permissions !== expected) {
      throw new Error(
        `File has unsafe permissions: ${permissions.toString(8)}. Expected: ${expectedPermissions}. Path: ${filePath}`,
      );
    }
  }

  // ファイルサイズの検証（キーファイルは正確にKEY_LENGTHバイトであるべき）
  if (stats.size !== KEY_LENGTH) {
    throw new Error(
      `Encryption key file has invalid size: ${stats.size} bytes. Expected: ${KEY_LENGTH} bytes`,
    );
  }
};

/**
 * 暗号化キーを取得または生成
 * safeStorageが利用できない環境用のフォールバック機能
 *
 * セキュリティ上の制限: マスターキーはファイルシステムに保存されるため、
 * 同一デバイス上でファイルアクセス権を持つ攻撃者には暗号化の保護が効かない。
 * 可能な限りsafeStorage（OS提供のキーストア）を優先して使用すること。
 */
const getOrCreateEncryptionKey = async (): Promise<Buffer> => {
  const userDataPath = app.getPath("userData");
  const keyPath = join(userDataPath, "tumiki-encryption.key");

  // 既存のキーファイルが存在する場合は読み込む
  if (existsSync(keyPath)) {
    try {
      await validateFilePermissions(keyPath, "600");
      const key = await readFile(keyPath);

      if (!isValidEncryptionKey(key)) {
        throw new Error("Encryption key file is corrupted or invalid");
      }

      return key;
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
        logger.error(
          "Encryption key validation failed",
          error instanceof Error ? error : { error },
        );
        throw error;
      }
    }
  }

  // 新しいキーを生成
  const key = randomBytes(KEY_LENGTH);

  if (!isValidEncryptionKey(key)) {
    throw new Error("Failed to generate valid encryption key");
  }

  // userDataディレクトリが存在しない場合は作成（所有者のみアクセス可能）
  if (!existsSync(userDataPath)) {
    await mkdir(userDataPath, { recursive: true, mode: 0o700 });

    // ディレクトリ権限の検証（Unix系のみ）
    if (process.platform !== "win32") {
      const dirStats = await stat(userDataPath);
      const dirPermissions = dirStats.mode & parseInt("777", 8);
      if (dirPermissions !== parseInt("700", 8)) {
        throw new Error(
          `User data directory has unsafe permissions: ${dirPermissions.toString(8)}. Expected: 700`,
        );
      }
    }
  }

  // アトミックな書き込み（一時ファイル経由）
  const tempPath = keyPath + ".tmp";

  try {
    await writeFile(tempPath, key, { mode: 0o600 });
    await validateFilePermissions(tempPath, "600");
    await rename(tempPath, keyPath);
    await validateFilePermissions(keyPath, "600");
  } catch (error) {
    if (existsSync(tempPath)) {
      try {
        await unlink(tempPath);
      } catch (cleanupError) {
        logger.error(
          "Failed to cleanup temporary key file",
          cleanupError instanceof Error
            ? cleanupError
            : { error: cleanupError },
        );
      }
    }
    throw error;
  }

  return key;
};

/**
 * Electron SafeStorage暗号化戦略
 * OS提供のキーストアを使用した安全な暗号化
 */
const createSafeStorageStrategy = (): EncryptionStrategy => ({
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  getPrefix: () => ENCRYPTION_PREFIX.SAFE_STORAGE,
  encrypt: async (plainText: string): Promise<string> => {
    const encryptedBuffer = safeStorage.encryptString(plainText);
    return encryptedBuffer.toString("base64");
  },
  decrypt: async (encryptedText: string): Promise<string> => {
    const encryptedBuffer = Buffer.from(encryptedText, "base64");
    return safeStorage.decryptString(encryptedBuffer);
  },
});

/**
 * Node.js crypto フォールバック暗号化戦略
 * safeStorageが使えない環境用の代替実装
 */
const createFallbackEncryptionStrategy = (): EncryptionStrategy => ({
  isAvailable: () => true,
  getPrefix: () => ENCRYPTION_PREFIX.FALLBACK,
  encrypt: async (plainText: string): Promise<string> => {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    const masterKey = await getOrCreateEncryptionKey();
    const key = (await scryptAsync(masterKey, salt, KEY_LENGTH)) as Buffer;

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    return result.toString("base64");
  },
  decrypt: async (encryptedText: string): Promise<string> => {
    const data = Buffer.from(encryptedText, "base64");

    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const masterKey = await getOrCreateEncryptionKey();
    const key = (await scryptAsync(masterKey, salt, KEY_LENGTH)) as Buffer;

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  },
});

/**
 * 利用可能な暗号化戦略を取得
 */
const getEncryptionStrategy = (): EncryptionStrategy => {
  const safeStorageStrategy = createSafeStorageStrategy();
  if (safeStorageStrategy.isAvailable()) {
    return safeStorageStrategy;
  }
  return createFallbackEncryptionStrategy();
};

/**
 * プレフィックスから適切な復号化戦略を取得
 */
const getDecryptionStrategy = (prefix: string): EncryptionStrategy => {
  switch (prefix) {
    case ENCRYPTION_PREFIX.SAFE_STORAGE:
      return createSafeStorageStrategy();
    case ENCRYPTION_PREFIX.FALLBACK:
      return createFallbackEncryptionStrategy();
    default:
      throw new Error(`Unknown encryption prefix: ${prefix}`);
  }
};

/**
 * トークンを暗号化
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト（プレフィックス付き）
 */
export const encryptToken = async (plainText: string): Promise<string> => {
  const strategy = getEncryptionStrategy();
  const encrypted = await strategy.encrypt(plainText);
  return `${strategy.getPrefix()}:${encrypted}`;
};

/**
 * トークンを復号化
 * @param encryptedText Base64エンコードされた暗号化テキスト（プレフィックス付き）
 * @returns 復号化された平文
 */
export const decryptToken = async (
  encryptedText: string,
): Promise<string> => {
  const separatorIndex = encryptedText.indexOf(":");

  if (separatorIndex > 0) {
    const prefix = encryptedText.substring(0, separatorIndex);
    const data = encryptedText.substring(separatorIndex + 1);

    try {
      const strategy = getDecryptionStrategy(prefix);
      return await strategy.decrypt(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown decryption error";
      logger.error(`Decryption failed with strategy "${prefix}"`, {
        message: errorMessage,
      });
      throw new Error(
        `Failed to decrypt token with strategy "${prefix}": ${errorMessage}`,
      );
    }
  }

  // 古い形式（プレフィックスなし）のサポート
  const safeStorageStrategy = createSafeStorageStrategy();
  if (safeStorageStrategy.isAvailable()) {
    try {
      return await safeStorageStrategy.decrypt(encryptedText);
    } catch {
      // safeStorageで失敗した場合はフォールバックを試す
    }
  }

  return await createFallbackEncryptionStrategy().decrypt(encryptedText);
};
