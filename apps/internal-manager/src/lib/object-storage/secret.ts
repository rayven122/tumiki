import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

const getObjectStorageEncryptionSecret = (): string => {
  const secret = process.env.OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    throw new Error(
      "OBJECT_STORAGE_SETTINGS_ENCRYPTION_KEY must be at least 32 characters long",
    );
  }

  return secret;
};

let cachedEncryptionSecret: string | null = null;
let cachedEncryptionKey: Buffer | null = null;
let didWarnPlaintextSecret = false;

const getEncryptionKey = (): Buffer => {
  const secret = getObjectStorageEncryptionSecret();
  if (cachedEncryptionSecret === secret && cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  cachedEncryptionSecret = secret;
  cachedEncryptionKey = createHash("sha256").update(secret).digest();
  return cachedEncryptionKey;
};

export const encryptObjectStorageSecret = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_SECRET_PREFIX}${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
};

export const decryptObjectStorageSecret = (value: string): string => {
  // 移行前の平文値を読めるようにする後方互換。設定の再保存後はenc:v1へ置き換わる。
  if (!value.startsWith(ENCRYPTED_SECRET_PREFIX)) {
    if (!didWarnPlaintextSecret) {
      console.warn(
        "[object-storage] シークレットが平文で保存されています。オブジェクトストレージ設定を再保存してください。",
      );
      didWarnPlaintextSecret = true;
    }
    return value;
  }

  const encryptedValue = value.slice(ENCRYPTED_SECRET_PREFIX.length);
  const [iv, authTag, encrypted] = encryptedValue.split(":");
  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted object storage secret");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};
