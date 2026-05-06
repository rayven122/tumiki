import "server-only";

import {
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  type KeyObject,
} from "node:crypto";
import { INTERNAL_MANAGER_SECRET_MIN_LENGTH } from "@/lib/auth/secret-constants";

const ROOT_SECRET_ENV = "TUMIKI_INTERNAL_MANAGER_SECRET_KEY";
const OIDC_PRIVATE_KEY_ENV = "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY";
const HKDF_SALT = "tumiki-internal-manager";

const getValidRootSecret = (): string | null => {
  const value = process.env[ROOT_SECRET_ENV];
  return value && value.length >= INTERNAL_MANAGER_SECRET_MIN_LENGTH
    ? value
    : null;
};

const deriveSecret = (purpose: string): string => {
  const rootSecret = getValidRootSecret();
  if (!rootSecret) {
    throw new Error(
      `${ROOT_SECRET_ENV} must be at least ${INTERNAL_MANAGER_SECRET_MIN_LENGTH} characters long`,
    );
  }

  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(rootSecret, "utf-8"),
      Buffer.from(HKDF_SALT, "utf-8"),
      Buffer.from(purpose, "utf-8"),
      32,
    ),
  ).toString("base64url");
};

const decodeBase64Pem = (envName: string, value: string): string => {
  const pem = Buffer.from(value, "base64").toString("utf-8");
  if (!pem.includes("-----BEGIN ") || !pem.includes("-----END ")) {
    throw new Error(
      `${envName} must be a base64-encoded PEM. Raw PEM values are not supported; base64 encode the PEM string before setting it.`,
    );
  }
  return pem;
};

class JacksonKeyValidationError extends Error {
  override readonly name = "JacksonKeyValidationError";
}

const exportPemText = (value: KeyObject): string => {
  const pem = value.export({ format: "pem", type: "spki" });
  return typeof pem === "string" ? pem : pem.toString("utf-8");
};

const assertRsaKeyPair = ({
  privateKey,
  publicKey,
  envNames,
}: {
  privateKey: ReturnType<typeof createPrivateKey>;
  publicKey: ReturnType<typeof createPublicKey>;
  envNames: string;
}): void => {
  if (
    privateKey.asymmetricKeyType !== "rsa" ||
    publicKey.asymmetricKeyType !== "rsa"
  ) {
    throw new JacksonKeyValidationError(
      `${envNames} must be valid RSA key PEM values`,
    );
  }

  if (exportPemText(createPublicKey(privateKey)) !== exportPemText(publicKey)) {
    throw new JacksonKeyValidationError(
      `${envNames}: private key and public key do not form a matching RSA key pair`,
    );
  }
};

export const hasInternalManagerRootSecret = (): boolean =>
  getValidRootSecret() !== null;

export const hasJacksonEncryptionKey = (): boolean =>
  (process.env.JACKSON_ENCRYPTION_KEY ?? "").length >=
    INTERNAL_MANAGER_SECRET_MIN_LENGTH || hasInternalManagerRootSecret();

export const getAuthSecret = (): string =>
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  deriveSecret("authjs-secret");

export const getJacksonEncryptionKey = (): string => {
  const explicit = process.env.JACKSON_ENCRYPTION_KEY;
  if (explicit && explicit.length >= INTERNAL_MANAGER_SECRET_MIN_LENGTH) {
    return explicit;
  }

  return deriveSecret("jackson-encryption-key");
};

export const hasJacksonOidcSigningKey = (): boolean =>
  (process.env[OIDC_PRIVATE_KEY_ENV] ?? "").length > 0 ||
  ((process.env.JACKSON_OIDC_PRIVATE_KEY ?? "").length > 0 &&
    (process.env.JACKSON_OIDC_PUBLIC_KEY ?? "").length > 0);

export const getJacksonOidcSigningKeys = ():
  | { private: string; public: string }
  | undefined => {
  const legacyPrivate = process.env.JACKSON_OIDC_PRIVATE_KEY;
  const legacyPublic = process.env.JACKSON_OIDC_PUBLIC_KEY;
  if (legacyPrivate && legacyPublic) {
    try {
      assertRsaKeyPair({
        privateKey: createPrivateKey(
          decodeBase64Pem("JACKSON_OIDC_PRIVATE_KEY", legacyPrivate),
        ),
        publicKey: createPublicKey(
          decodeBase64Pem("JACKSON_OIDC_PUBLIC_KEY", legacyPublic),
        ),
        envNames: "JACKSON_OIDC_PRIVATE_KEY and JACKSON_OIDC_PUBLIC_KEY",
      });
    } catch (error) {
      if (error instanceof JacksonKeyValidationError) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `JACKSON_OIDC_PRIVATE_KEY and JACKSON_OIDC_PUBLIC_KEY must be valid RSA key PEM values: ${detail}`,
      );
    }
    return { private: legacyPrivate, public: legacyPublic };
  }
  if (legacyPrivate || legacyPublic) {
    console.warn(
      "Both JACKSON_OIDC_PRIVATE_KEY and JACKSON_OIDC_PUBLIC_KEY must be set to use legacy Jackson OIDC signing keys. Falling back to TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY.",
    );
  }

  const encodedPrivateKey = process.env[OIDC_PRIVATE_KEY_ENV];
  if (!encodedPrivateKey) return undefined;

  const privatePem = decodeBase64Pem(OIDC_PRIVATE_KEY_ENV, encodedPrivateKey);
  const privateKey = (() => {
    try {
      const key = createPrivateKey(privatePem);
      if (key.asymmetricKeyType !== "rsa") {
        throw new Error("key must be RSA");
      }
      return key;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${OIDC_PRIVATE_KEY_ENV} must be a base64-encoded PKCS8 private PEM: ${detail}`,
      );
    }
  })();
  const publicPem = createPublicKey(privateKey).export({
    format: "pem",
    type: "spki",
  });
  const publicPemText =
    typeof publicPem === "string" ? publicPem : publicPem.toString("utf-8");

  return {
    private: encodedPrivateKey,
    public: Buffer.from(publicPemText, "utf-8").toString("base64"),
  };
};
