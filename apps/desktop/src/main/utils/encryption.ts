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
  renameSync,
  unlinkSync,
} from "fs";
import { readFile, writeFile, mkdir, stat, rename, unlink } from "fs/promises";

// フォールバック暗号化用の定数
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * 暗号化戦略のインターフェース
 */
type EncryptionStrategy = {
  encrypt: (plainText: string) => string;
  decrypt: (encryptedText: string) => string;
  isAvailable: () => boolean;
  getPrefix: () => string;
};

/**
 * 非同期暗号化戦略のインターフェース
 */
type AsyncEncryptionStrategy = {
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
  // キーの長さが正しいかチェック
  if (key.length !== KEY_LENGTH) {
    return false;
  }

  // 全バイトがゼロでないかチェック（初期化されていないキーを除外）
  if (key.every((byte) => byte === 0)) {
    return false;
  }

  // 全バイトが同じ値でないかチェック（無効なキーを除外）
  const firstByte = key[0];
  if (key.every((byte) => byte === firstByte)) {
    return false;
  }

  return true;
};

/**
 * ファイル権限を検証（同期版 - 後方互換性のため残す）
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
 * ファイル権限を検証（非同期版）
 * @param filePath ファイルパス
 * @param expectedPermissions 期待されるパーミッション（8進数文字列）
 * @throws {Error} 権限が一致しない場合
 */
const validateFilePermissionsAsync = async (
  filePath: string,
  expectedPermissions: string,
): Promise<void> => {
  try {
    const stats = await stat(filePath);
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
  // より明示的なファイル名を使用
  const keyPath = join(userDataPath, "tumiki-encryption.key");

  // 既存のキーファイルが存在する場合は読み込む
  if (existsSync(keyPath)) {
    try {
      // ファイル権限とサイズの検証
      validateFilePermissions(keyPath, "600");

      // キーファイルを読み込み
      const key = readFileSync(keyPath);

      // キーの整合性をチェック
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
        // セキュリティエラーは致命的なのでログに記録して再スロー
        console.error("Encryption key validation failed:", error);
        throw error;
      }
    }
  }

  // 新しいキーを生成
  const key = randomBytes(KEY_LENGTH);

  // キーの整合性を確認（生成されたキーが有効であることを保証）
  if (!isValidEncryptionKey(key)) {
    throw new Error("Failed to generate valid encryption key");
  }

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

  // アトミックな書き込み（一時ファイル経由）
  // これにより、書き込み中のファイル破損を防ぐ
  const tempPath = keyPath + ".tmp";

  try {
    // 一時ファイルに書き込み
    writeFileSync(tempPath, key, { mode: 0o600 });

    // 一時ファイルの権限とサイズを検証
    validateFilePermissions(tempPath, "600");

    // アトミックにリネーム（POSIX仕様ではrenameはアトミック操作）
    renameSync(tempPath, keyPath);

    // 最終的なファイルの権限とサイズを検証
    validateFilePermissions(keyPath, "600");
  } catch (error) {
    // エラー時は一時ファイルをクリーンアップ
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch (cleanupError) {
        console.error("Failed to cleanup temporary key file:", cleanupError);
      }
    }
    throw error;
  }

  return key;
};

/**
 * 暗号化キーを取得または生成（非同期版）
 * safeStorageが利用できない環境用のフォールバック機能
 */
const getOrCreateEncryptionKeyAsync = async (): Promise<Buffer> => {
  const userDataPath = app.getPath("userData");
  // より明示的なファイル名を使用
  const keyPath = join(userDataPath, "tumiki-encryption.key");

  // 既存のキーファイルが存在する場合は読み込む
  if (existsSync(keyPath)) {
    try {
      // ファイル権限とサイズの検証
      await validateFilePermissionsAsync(keyPath, "600");

      // キーファイルを読み込み
      const key = await readFile(keyPath);

      // キーの整合性をチェック
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
        // セキュリティエラーは致命的なのでログに記録して再スロー
        console.error("Encryption key validation failed:", error);
        throw error;
      }
    }
  }

  // 新しいキーを生成
  const key = randomBytes(KEY_LENGTH);

  // キーの整合性を確認（生成されたキーが有効であることを保証）
  if (!isValidEncryptionKey(key)) {
    throw new Error("Failed to generate valid encryption key");
  }

  // userDataディレクトリが存在しない場合は作成（所有者のみアクセス可能）
  if (!existsSync(userDataPath)) {
    await mkdir(userDataPath, { recursive: true, mode: 0o700 });

    // ディレクトリ権限の検証
    const dirStats = await stat(userDataPath);
    const dirPermissions = dirStats.mode & parseInt("777", 8);
    if (dirPermissions !== parseInt("700", 8)) {
      throw new Error(
        `User data directory has unsafe permissions: ${dirPermissions.toString(8)}. Expected: 700`,
      );
    }
  }

  // アトミックな書き込み（一時ファイル経由）
  // これにより、書き込み中のファイル破損を防ぐ
  const tempPath = keyPath + ".tmp";

  try {
    // 一時ファイルに書き込み
    await writeFile(tempPath, key, { mode: 0o600 });

    // 一時ファイルの権限とサイズを検証
    await validateFilePermissionsAsync(tempPath, "600");

    // アトミックにリネーム（POSIX仕様ではrenameはアトミック操作）
    await rename(tempPath, keyPath);

    // 最終的なファイルの権限とサイズを検証
    await validateFilePermissionsAsync(keyPath, "600");
  } catch (error) {
    // エラー時は一時ファイルをクリーンアップ
    if (existsSync(tempPath)) {
      try {
        await unlink(tempPath);
      } catch (cleanupError) {
        console.error("Failed to cleanup temporary key file:", cleanupError);
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
  getPrefix: () => "safe",
  encrypt: (plainText: string): string => {
    const encryptedBuffer = safeStorage.encryptString(plainText);
    return encryptedBuffer.toString("base64");
  },
  decrypt: (encryptedText: string): string => {
    const encryptedBuffer = Buffer.from(encryptedText, "base64");
    return safeStorage.decryptString(encryptedBuffer);
  },
});

/**
 * Node.js crypto フォールバック暗号化戦略
 * safeStorageが使えない環境用の代替実装
 */
const createFallbackEncryptionStrategy = (): EncryptionStrategy => ({
  isAvailable: () => true, // 常に利用可能
  getPrefix: () => "fallback",
  encrypt: (plainText: string): string => {
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
  },
  decrypt: (encryptedText: string): string => {
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
  },
});

/**
 * 利用可能な暗号化戦略を取得
 * SafeStorageが利用可能ならそれを、そうでなければフォールバックを返す
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
    case "safe":
      return createSafeStorageStrategy();
    case "fallback":
      return createFallbackEncryptionStrategy();
    default:
      throw new Error(`Unknown encryption prefix: ${prefix}`);
  }
};

/**
 * トークンを暗号化
 * 利用可能な最適な暗号化戦略を使用
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト（プレフィックス付き）
 */
export const encryptToken = (plainText: string): string => {
  const strategy = getEncryptionStrategy();
  const encrypted = strategy.encrypt(plainText);
  // プレフィックスを付けて暗号化方式を識別
  return `${strategy.getPrefix()}:${encrypted}`;
};

/**
 * トークンを復号化
 * 暗号化方式のプレフィックスに基づいて適切な復号化戦略を使用
 * @param encryptedText Base64エンコードされた暗号化テキスト（プレフィックス付き）
 * @returns 復号化された平文
 */
export const decryptToken = (encryptedText: string): string => {
  // プレフィックスを抽出
  const separatorIndex = encryptedText.indexOf(":");

  if (separatorIndex > 0) {
    const prefix = encryptedText.substring(0, separatorIndex);
    const data = encryptedText.substring(separatorIndex + 1);

    try {
      const strategy = getDecryptionStrategy(prefix);
      return strategy.decrypt(data);
    } catch (error) {
      console.error(`Failed to decrypt with strategy: ${prefix}`, error);
      // フォールバック戦略で試す
      return createFallbackEncryptionStrategy().decrypt(data);
    }
  }

  // 古い形式（プレフィックスなし）のサポート
  // safeStorageで試してみる
  const safeStorageStrategy = createSafeStorageStrategy();
  if (safeStorageStrategy.isAvailable()) {
    try {
      return safeStorageStrategy.decrypt(encryptedText);
    } catch {
      // safeStorageで失敗した場合はフォールバックを試す
    }
  }

  // 最後の手段としてフォールバックで復号化
  return createFallbackEncryptionStrategy().decrypt(encryptedText);
};

/**
 * 非同期版フォールバック暗号化戦略
 * ファイルI/Oを非同期で実行し、UI応答性を向上
 */
const createAsyncFallbackEncryptionStrategy = (): AsyncEncryptionStrategy => ({
  isAvailable: () => true, // 常に利用可能
  getPrefix: () => "fallback",
  encrypt: async (plainText: string): Promise<string> => {
    // ソルトとIVを生成
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // キーを非同期で取得
    const masterKey = await getOrCreateEncryptionKeyAsync();

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
  },
  decrypt: async (encryptedText: string): Promise<string> => {
    const data = Buffer.from(encryptedText, "base64");

    // salt, iv, authTag, encrypted を分離
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // キーを非同期で取得
    const masterKey = await getOrCreateEncryptionKeyAsync();

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
  },
});

/**
 * 利用可能な非同期暗号化戦略を取得
 * SafeStorageが利用可能ならそれを、そうでなければ非同期フォールバックを返す
 */
const getAsyncEncryptionStrategy = (): AsyncEncryptionStrategy => {
  const safeStorageStrategy = createSafeStorageStrategy();
  if (safeStorageStrategy.isAvailable()) {
    // SafeStorage戦略を非同期ラッパーで包む
    return {
      isAvailable: safeStorageStrategy.isAvailable,
      getPrefix: safeStorageStrategy.getPrefix,
      encrypt: async (plainText: string) =>
        Promise.resolve(safeStorageStrategy.encrypt(plainText)),
      decrypt: async (encryptedText: string) =>
        Promise.resolve(safeStorageStrategy.decrypt(encryptedText)),
    };
  }
  return createAsyncFallbackEncryptionStrategy();
};

/**
 * プレフィックスから適切な非同期復号化戦略を取得
 */
const getAsyncDecryptionStrategy = (
  prefix: string,
): AsyncEncryptionStrategy => {
  switch (prefix) {
    case "safe": {
      const safeStorageStrategy = createSafeStorageStrategy();
      return {
        isAvailable: safeStorageStrategy.isAvailable,
        getPrefix: safeStorageStrategy.getPrefix,
        encrypt: async (plainText: string) =>
          Promise.resolve(safeStorageStrategy.encrypt(plainText)),
        decrypt: async (encryptedText: string) =>
          Promise.resolve(safeStorageStrategy.decrypt(encryptedText)),
      };
    }
    case "fallback":
      return createAsyncFallbackEncryptionStrategy();
    default:
      throw new Error(`Unknown encryption prefix: ${prefix}`);
  }
};

/**
 * トークンを非同期で暗号化
 * ファイルI/Oを非同期で実行し、UI応答性を向上
 * @param plainText 暗号化する平文
 * @returns Base64エンコードされた暗号化テキスト（プレフィックス付き）
 */
export const encryptTokenAsync = async (plainText: string): Promise<string> => {
  const strategy = getAsyncEncryptionStrategy();
  const encrypted = await strategy.encrypt(plainText);
  // プレフィックスを付けて暗号化方式を識別
  return `${strategy.getPrefix()}:${encrypted}`;
};

/**
 * トークンを非同期で復号化
 * ファイルI/Oを非同期で実行し、UI応答性を向上
 * @param encryptedText Base64エンコードされた暗号化テキスト（プレフィックス付き）
 * @returns 復号化された平文
 */
export const decryptTokenAsync = async (
  encryptedText: string,
): Promise<string> => {
  // プレフィックスを抽出
  const separatorIndex = encryptedText.indexOf(":");

  if (separatorIndex > 0) {
    const prefix = encryptedText.substring(0, separatorIndex);
    const data = encryptedText.substring(separatorIndex + 1);

    try {
      const strategy = getAsyncDecryptionStrategy(prefix);
      return await strategy.decrypt(data);
    } catch (error) {
      console.error(`Failed to decrypt with strategy: ${prefix}`, error);
      // フォールバック戦略で試す
      return await createAsyncFallbackEncryptionStrategy().decrypt(data);
    }
  }

  // 古い形式（プレフィックスなし）のサポート
  // safeStorageで試してみる
  const safeStorageStrategy = createSafeStorageStrategy();
  if (safeStorageStrategy.isAvailable()) {
    try {
      return safeStorageStrategy.decrypt(encryptedText);
    } catch {
      // safeStorageで失敗した場合はフォールバックを試す
    }
  }

  // 最後の手段としてフォールバックで復号化
  return await createAsyncFallbackEncryptionStrategy().decrypt(encryptedText);
};
