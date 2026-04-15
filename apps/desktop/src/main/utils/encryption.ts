import { randomBytes, createCipheriv, createDecipheriv, scrypt } from "crypto";
import { join } from "path";
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
import * as logger from "../shared/utils/logger";
import { resolveUserDataPath } from "../../shared/user-data-path";

// 暗号化用の定数
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

// 暗号化戦略のプレフィックス定数
const ENCRYPTION_PREFIX = "fallback";

// scryptの非同期版（コストパラメータを明示指定してNode.jsバージョン間の互換性を保証）
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
    const userDataPath = resolveUserDataPath();
    if (!filePath.toLowerCase().startsWith(userDataPath.toLowerCase())) {
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
 *
 * セキュリティ上の制限: マスターキーはファイルシステムに保存されるため、
 * 同一デバイス上でファイルアクセス権を持つ攻撃者には暗号化の保護が効かない。
 * ファイルパーミッション(0600)とOS標準のディスク暗号化に委ねる。
 */
// メモリキャッシュ：初回読み込み後はディスクI/Oを回避
let cachedEncryptionKey: Buffer | null = null;

const getOrCreateEncryptionKey = async (): Promise<Buffer> => {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const userDataPath = resolveUserDataPath();
  const keyPath = join(userDataPath, "tumiki-encryption.key");

  // 既存のキーファイルが存在する場合は読み込む
  const keyFileExists = await access(keyPath)
    .then(() => true)
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return false;
      throw err;
    });
  if (keyFileExists) {
    try {
      await validateFilePermissions(keyPath, "600");
      const key = await readFile(keyPath);

      if (!isValidEncryptionKey(key)) {
        throw new Error("Encryption key file is corrupted or invalid");
      }

      cachedEncryptionKey = key;
      return key;
    } catch (error) {
      // ENOENT 以外のエラー（権限エラー、ファイル破損等）は再スロー
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        )
      ) {
        logger.error(
          "Encryption key validation failed",
          error instanceof Error ? error : { error },
        );
        throw error;
      }
      // ENOENT: ファイルが存在しないため新規作成フローに進む
    }
  }

  // 新しいキーを生成
  const key = randomBytes(KEY_LENGTH);

  if (!isValidEncryptionKey(key)) {
    throw new Error("Failed to generate valid encryption key");
  }

  // userDataディレクトリが存在しない場合は作成（所有者のみアクセス可能）
  const userDataDirExists = await access(userDataPath)
    .then(() => true)
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return false;
      throw err;
    });
  if (!userDataDirExists) {
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
    const tempFileExists = await access(tempPath)
      .then(() => true)
      .catch((err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") return false;
        throw err;
      });
    if (tempFileExists) {
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

  cachedEncryptionKey = key;
  return key;
};

/**
 * トークンを暗号化（AES-256-GCM + ファイルベース鍵）
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト（プレフィックス付き）
 */
export const encryptToken = async (plainText: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  const masterKey = await getOrCreateEncryptionKey();
  const key = await scryptAsync(masterKey, salt, KEY_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const result = Buffer.concat([salt, iv, authTag, encrypted]);
  return `${ENCRYPTION_PREFIX}:${result.toString("base64")}`;
};

/**
 * トークンを復号化
 * @param encryptedText Base64エンコードされた暗号化テキスト（プレフィックス付き）
 * @returns 復号化された平文
 */
export const decryptToken = async (encryptedText: string): Promise<string> => {
  const separatorIndex = encryptedText.indexOf(":");

  if (separatorIndex <= 0) {
    throw new Error(
      "暗号化トークンのフォーマットが不正です（プレフィックスがありません）",
    );
  }

  const prefix = encryptedText.substring(0, separatorIndex);
  const base64Data = encryptedText.substring(separatorIndex + 1);

  if (prefix !== ENCRYPTION_PREFIX) {
    throw new Error(
      `不明な暗号化プレフィックス: "${prefix}"（"${ENCRYPTION_PREFIX}" のみ対応）`,
    );
  }

  const data = Buffer.from(base64Data, "base64");

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const masterKey = await getOrCreateEncryptionKey();
  const key = await scryptAsync(masterKey, salt, KEY_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

/**
 * 暗号化キーのメモリキャッシュをクリア
 * @internal テスト専用。プロダクションコードからの呼び出し禁止。
 * ランタイムガードにより、テスト環境以外では例外をスローする。
 */
export const _resetEncryptionKeyCache = (): void => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("_resetEncryptionKeyCache はテスト環境でのみ使用できます");
  }
  cachedEncryptionKey = null;
};
