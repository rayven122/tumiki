import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockReadFile = vi.hoisted(() =>
  vi.fn<(path: string, encoding: BufferEncoding) => Promise<string>>(),
);

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

type CreateSamlArgs = {
  tenant: string;
  product: string;
  rawMetadata: string;
  defaultRedirectUrl: string;
  redirectUrl: string;
};

type CreateOidcArgs = {
  tenant: string;
  product: string;
  oidcDiscoveryUrl: string;
  oidcClientId: string;
  oidcClientSecret: string;
  defaultRedirectUrl: string;
  redirectUrl: string;
};

const mockCreateSAMLConnection =
  vi.fn<(args: CreateSamlArgs) => Promise<unknown>>();
const mockCreateOIDCConnection =
  vi.fn<(args: CreateOidcArgs) => Promise<unknown>>();
const mockGetJackson = vi.fn();
const mockResolveExternalUrl = vi.fn<() => string>();

const envKeys = [
  "OIDC_ISSUER",
  "OIDC_CLIENT_ID",
  "OIDC_CLIENT_SECRET",
  "OIDC_DESKTOP_CLIENT_ID",
  "INTERNAL_DATABASE_URL",
  "TUMIKI_INTERNAL_MANAGER_SECRET_KEY",
  "TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY",
  "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
  "TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML",
  "TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH",
  "TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL",
  "TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID",
  "TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET",
  "NEXTAUTH_URL_INTERNAL_MANAGER",
  "NEXTAUTH_URL",
  "JACKSON_ENCRYPTION_KEY",
  "JACKSON_OIDC_PRIVATE_KEY",
  "JACKSON_OIDC_PUBLIC_KEY",
  "JACKSON_SAML_METADATA_XML",
  "JACKSON_SAML_METADATA_PATH",
  "JACKSON_TENANT",
  "JACKSON_PRODUCT",
  "JACKSON_WEB_PRODUCT",
  "JACKSON_DESKTOP_PRODUCT",
  "JACKSON_DESKTOP_REDIRECT_URL",
] as const;

const clearEnv = (): void => {
  vi.unstubAllEnvs();
  for (const key of envKeys) {
    delete process.env[key];
  }
};

const setEnv = (key: (typeof envKeys)[number], value: string): void => {
  vi.stubEnv(key, value);
};

const loadModule = async () => {
  vi.doMock("../index", () => ({
    getJackson: mockGetJackson,
    resolveExternalUrl: mockResolveExternalUrl,
  }));

  return import("../oidc-clients");
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  clearEnv();

  mockReadFile.mockResolvedValue("<xml-from-file />");
  mockResolveExternalUrl.mockReturnValue("https://internal.example.com");
  mockGetJackson.mockResolvedValue({
    connectionAPIController: {
      createSAMLConnection: mockCreateSAMLConnection,
      createOIDCConnection: mockCreateOIDCConnection,
    },
  });
  mockCreateSAMLConnection.mockImplementation(async (args) => ({
    clientID: `${args.product}-client`,
    clientSecret: `${args.product}-secret`,
  }));
  mockCreateOIDCConnection.mockImplementation(async (args) => ({
    clientID: `${args.product}-oidc-client`,
    clientSecret: `${args.product}-oidc-secret`,
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const configureCustomJacksonAutoEnv = (): void => {
  setEnv("INTERNAL_DATABASE_URL", "postgresql://localhost/tumiki");
  setEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
  setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "encoded-private-key");
  setEnv("TUMIKI_INTERNAL_MANAGER_PUBLIC_URL", "https://internal.example.com");
  setEnv("TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML", "<xml />");
  setEnv("JACKSON_TENANT", "tenant-001");
  setEnv("JACKSON_WEB_PRODUCT", "tumiki-web");
  setEnv("JACKSON_DESKTOP_PRODUCT", "tumiki-desktop");
  setEnv("JACKSON_DESKTOP_REDIRECT_URL", "tumiki://auth/callback");
};

describe("oidc-clients", () => {
  test("旧OIDC_*設定はAuth.js直結ではなくJackson upstream OIDCとして扱う", async () => {
    setEnv("INTERNAL_DATABASE_URL", "postgresql://localhost/tumiki");
    setEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "encoded-private-key");
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      "https://internal.example.com",
    );
    setEnv("OIDC_ISSUER", "https://idp.example.com/realms/tumiki");
    setEnv("OIDC_CLIENT_ID", "upstream-client");
    setEnv("OIDC_CLIENT_SECRET", "upstream-secret");
    const { ensureJacksonOidcClients } = await loadModule();

    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual({
      OIDC_ISSUER: "https://internal.example.com",
      OIDC_CLIENT_ID: "tumiki-oidc-client",
      OIDC_CLIENT_SECRET: "tumiki-oidc-secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop-oidc-client",
    });
    expect(mockCreateSAMLConnection).not.toHaveBeenCalled();
    expect(mockCreateOIDCConnection).toHaveBeenCalledWith({
      tenant: "default",
      product: "tumiki",
      oidcDiscoveryUrl:
        "https://idp.example.com/realms/tumiki/.well-known/openid-configuration",
      oidcClientId: "upstream-client",
      oidcClientSecret: "upstream-secret",
      defaultRedirectUrl: "https://internal.example.com/api/auth/callback/oidc",
      redirectUrl: JSON.stringify([
        "https://internal.example.com/api/auth/callback/oidc",
      ]),
    });
  });

  test("TUMIKI_INTERNAL_MANAGER_OIDC_*設定でJackson upstream OIDC connectionを生成する", async () => {
    setEnv("INTERNAL_DATABASE_URL", "postgresql://localhost/tumiki");
    setEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "encoded-private-key");
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      "https://internal.example.com",
    );
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL",
      "https://idp.example.com/.well-known/openid-configuration",
    );
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID", "upstream-client");
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET", "upstream-secret");
    const { ensureJacksonOidcClients } = await loadModule();

    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual({
      OIDC_ISSUER: "https://internal.example.com",
      OIDC_CLIENT_ID: "tumiki-oidc-client",
      OIDC_CLIENT_SECRET: "tumiki-oidc-secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop-oidc-client",
    });
    expect(mockCreateSAMLConnection).not.toHaveBeenCalled();
    expect(mockCreateOIDCConnection).toHaveBeenCalledTimes(2);
  });

  test("Jackson自動設定が未設定ならエラーを返す", async () => {
    const { ensureJacksonOidcClients, isJacksonAutoOidcConfigured } =
      await loadModule();

    expect(isJacksonAutoOidcConfigured()).toBe(false);
    await expect(ensureJacksonOidcClients()).rejects.toThrow(
      "OIDC is not configured",
    );
  });

  test("SAMLとOIDC upstreamが両方設定されている場合は競合エラーを返す", async () => {
    configureCustomJacksonAutoEnv();
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL",
      "https://idp.example.com",
    );
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID", "upstream-client");
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET", "upstream-secret");
    const { ensureJacksonOidcClients, isJacksonAutoOidcConfigured } =
      await loadModule();

    expect(isJacksonAutoOidcConfigured()).toBe(false);
    await expect(ensureJacksonOidcClients()).rejects.toThrow(
      "Configure either SAML upstream or OIDC upstream, not both",
    );
  });

  test("Jackson自動設定では並行呼び出しを1サイクルのconnection生成にまとめる", async () => {
    configureCustomJacksonAutoEnv();
    const { ensureJacksonOidcClients, isJacksonAutoOidcConfigured } =
      await loadModule();

    const [first, second] = await Promise.all([
      ensureJacksonOidcClients(),
      ensureJacksonOidcClients(),
    ]);

    expect(isJacksonAutoOidcConfigured()).toBe(true);
    expect(first).toStrictEqual(second);
    expect(first).toStrictEqual({
      OIDC_ISSUER: "https://internal.example.com",
      OIDC_CLIENT_ID: "tumiki-web-client",
      OIDC_CLIENT_SECRET: "tumiki-web-secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop-client",
    });
    expect(mockCreateSAMLConnection).toHaveBeenCalledTimes(2);
    expect(mockCreateOIDCConnection).not.toHaveBeenCalled();
    expect(mockCreateSAMLConnection).toHaveBeenCalledWith({
      tenant: "tenant-001",
      product: "tumiki-web",
      rawMetadata: "<xml />",
      defaultRedirectUrl: "https://internal.example.com/api/auth/callback/oidc",
      redirectUrl: JSON.stringify([
        "https://internal.example.com/api/auth/callback/oidc",
      ]),
    });
    expect(mockCreateSAMLConnection).toHaveBeenCalledWith({
      tenant: "tenant-001",
      product: "tumiki-desktop",
      rawMetadata: "<xml />",
      defaultRedirectUrl: "tumiki://auth/callback",
      redirectUrl: JSON.stringify(["tumiki://auth/callback"]),
    });
  });

  test("Jackson自動設定は成功後の設定をキャッシュする", async () => {
    configureCustomJacksonAutoEnv();
    const { ensureJacksonOidcClients } = await loadModule();

    const first = await ensureJacksonOidcClients();

    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual(first);
    expect(mockCreateSAMLConnection).toHaveBeenCalledTimes(2);
  });

  test("Jackson自動設定はreset後にconnection生成を再実行する", async () => {
    configureCustomJacksonAutoEnv();
    const { ensureJacksonOidcClients, resetOidcClients } = await loadModule();

    const first = await ensureJacksonOidcClients();
    expect(mockCreateSAMLConnection).toHaveBeenCalledTimes(2);

    resetOidcClients();
    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual(first);
    expect(mockCreateSAMLConnection).toHaveBeenCalledTimes(4);
  });

  test("Jackson自動設定はmetadata pathからXMLを読み込める", async () => {
    setEnv("INTERNAL_DATABASE_URL", "postgresql://localhost/tumiki");
    setEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "encoded-private-key");
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      "https://internal.example.com",
    );
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH",
      "/tmp/idp-metadata.xml",
    );
    const { ensureJacksonOidcClients } = await loadModule();

    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual({
      OIDC_ISSUER: "https://internal.example.com",
      OIDC_CLIENT_ID: "tumiki-client",
      OIDC_CLIENT_SECRET: "tumiki-secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop-client",
    });
    expect(mockReadFile).toHaveBeenCalledWith("/tmp/idp-metadata.xml", "utf-8");
    expect(mockCreateSAMLConnection).toHaveBeenCalledWith(
      expect.objectContaining({ rawMetadata: "<xml-from-file />" }),
    );
  });

  test("metadata pathの読み込み失敗は詳細を保持してエラーにする", async () => {
    setEnv("INTERNAL_DATABASE_URL", "postgresql://localhost/tumiki");
    setEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "encoded-private-key");
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      "https://internal.example.com",
    );
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH",
      "/tmp/missing-metadata.xml",
    );
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT metadata"));
    const { ensureJacksonOidcClients } = await loadModule();

    await expect(ensureJacksonOidcClients()).rejects.toThrow(
      "OIDC upstream config failed: ENOENT metadata",
    );
  });

  test("Jackson自動設定の生成失敗後は次回呼び出しで再試行できる", async () => {
    setEnv("INTERNAL_DATABASE_URL", "postgresql://localhost/tumiki");
    setEnv("TUMIKI_INTERNAL_MANAGER_SECRET_KEY", "x".repeat(32));
    setEnv("TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY", "encoded-private-key");
    setEnv(
      "TUMIKI_INTERNAL_MANAGER_PUBLIC_URL",
      "https://internal.example.com",
    );
    setEnv("TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML", "<xml />");
    mockCreateSAMLConnection
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockImplementation(async (args) => ({
        clientID: `${args.product}-client`,
        clientSecret: `${args.product}-secret`,
      }));
    const { ensureJacksonOidcClients } = await loadModule();

    await expect(ensureJacksonOidcClients()).rejects.toThrow(
      "temporary failure",
    );
    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual({
      OIDC_ISSUER: "https://internal.example.com",
      OIDC_CLIENT_ID: "tumiki-client",
      OIDC_CLIENT_SECRET: "tumiki-secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop-client",
    });
    expect(mockCreateSAMLConnection).toHaveBeenCalledTimes(3);
  });
});
