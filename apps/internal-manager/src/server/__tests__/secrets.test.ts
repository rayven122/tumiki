import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const envKeys = [
  "TUMIKI_INTERNAL_MANAGER_SECRET_KEY",
  "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "JACKSON_ENCRYPTION_KEY",
  "JACKSON_OIDC_PRIVATE_KEY",
  "JACKSON_OIDC_PUBLIC_KEY",
] as const;

const clearEnv = (): void => {
  vi.unstubAllEnvs();
  for (const key of envKeys) {
    delete process.env[key];
  }
};

const loadModule = async () => {
  vi.doMock("server-only", () => ({}));
  return import("../secrets");
};

const generateEncodedKeyPair = (): {
  privateKey: string;
  publicKey: string;
} => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki",
    },
  });

  return {
    privateKey: Buffer.from(privateKey, "utf-8").toString("base64"),
    publicKey: Buffer.from(publicKey, "utf-8").toString("base64"),
  };
};

beforeEach(() => {
  vi.resetModules();
  clearEnv();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearEnv();
});

describe("internal manager secrets", () => {
  test("root secretから用途別secretを安定して導出する", async () => {
    vi.stubEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    const { getAuthSecret, getJacksonEncryptionKey } = await loadModule();

    const authSecret = getAuthSecret();
    const jacksonSecret = getJacksonEncryptionKey();

    expect(authSecret).toHaveLength(43);
    expect(jacksonSecret).toHaveLength(43);
    expect(authSecret).not.toBe(jacksonSecret);
    expect(getAuthSecret()).toBe(authSecret);
    expect(getJacksonEncryptionKey()).toBe(jacksonSecret);
  });

  test("互換用の明示secretがあれば導出より優先する", async () => {
    vi.stubEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    vi.stubEnv("AUTH_SECRET", "explicit-auth-secret");
    vi.stubEnv("JACKSON_ENCRYPTION_KEY", "y".repeat(32));
    const { getAuthSecret, getJacksonEncryptionKey } = await loadModule();

    expect(getAuthSecret()).toBe("explicit-auth-secret");
    expect(getJacksonEncryptionKey()).toBe("y".repeat(32));
  });

  test("OIDC public keyはmanager private keyから導出する", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: {
        format: "pem",
        type: "pkcs8",
      },
      publicKeyEncoding: {
        format: "pem",
        type: "spki",
      },
    });
    vi.stubEnv(
      "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY",
      Buffer.from(privateKey, "utf-8").toString("base64"),
    );
    const { getJacksonOidcSigningKeys } = await loadModule();

    expect(getJacksonOidcSigningKeys()).toStrictEqual({
      private: Buffer.from(privateKey, "utf-8").toString("base64"),
      public: Buffer.from(publicKey, "utf-8").toString("base64"),
    });
  });

  test("互換用のJackson OIDC key pairは検証してからそのまま使う", async () => {
    const { privateKey, publicKey } = generateEncodedKeyPair();
    vi.stubEnv("JACKSON_OIDC_PRIVATE_KEY", privateKey);
    vi.stubEnv("JACKSON_OIDC_PUBLIC_KEY", publicKey);
    const { getJacksonOidcSigningKeys } = await loadModule();

    expect(getJacksonOidcSigningKeys()).toStrictEqual({
      private: privateKey,
      public: publicKey,
    });
  });

  test("互換用のJackson OIDC key pairが一致しない場合はエラーを返す", async () => {
    const first = generateEncodedKeyPair();
    const second = generateEncodedKeyPair();
    vi.stubEnv("JACKSON_OIDC_PRIVATE_KEY", first.privateKey);
    vi.stubEnv("JACKSON_OIDC_PUBLIC_KEY", second.publicKey);
    const { getJacksonOidcSigningKeys } = await loadModule();

    expect(() => getJacksonOidcSigningKeys()).toThrow(
      "private key and public key do not form a matching RSA key pair",
    );
  });

  test("互換用のJackson OIDC key pairが不正な場合はエラーを返す", async () => {
    vi.stubEnv("JACKSON_OIDC_PRIVATE_KEY", "legacy-private");
    vi.stubEnv("JACKSON_OIDC_PUBLIC_KEY", "legacy-public");
    const { getJacksonOidcSigningKeys } = await loadModule();

    expect(() => getJacksonOidcSigningKeys()).toThrow(
      "JACKSON_OIDC_PRIVATE_KEY must be a base64-encoded PEM",
    );
  });

  test("互換用のJackson OIDC keyが片方だけの場合は警告して新形式へフォールバックする", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { privateKey } = generateEncodedKeyPair();
    const next = generateEncodedKeyPair();
    vi.stubEnv("JACKSON_OIDC_PRIVATE_KEY", privateKey);
    vi.stubEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", next.privateKey);
    const { getJacksonOidcSigningKeys } = await loadModule();

    expect(getJacksonOidcSigningKeys()).toStrictEqual({
      private: next.privateKey,
      public: next.publicKey,
    });
    expect(warn).toHaveBeenCalledWith(
      "Both JACKSON_OIDC_PRIVATE_KEY and JACKSON_OIDC_PUBLIC_KEY must be set to use legacy Jackson OIDC signing keys. Falling back to TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY.",
    );
  });

  test("manager private keyが不正な場合は設定名を含むエラーを返す", async () => {
    vi.stubEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "invalid-key");
    const { getJacksonOidcSigningKeys } = await loadModule();

    expect(() => getJacksonOidcSigningKeys()).toThrow(
      "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY must be a base64-encoded PEM",
    );
  });
});
