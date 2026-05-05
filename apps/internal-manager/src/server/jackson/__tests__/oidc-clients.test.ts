import { beforeEach, describe, expect, test, vi } from "vitest";

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

const mockCreateSAMLConnection =
  vi.fn<(args: CreateSamlArgs) => Promise<unknown>>();
const mockGetJackson = vi.fn();
const mockIsJacksonConfigured = vi.fn<() => boolean>();
const mockResolveExternalUrl = vi.fn<() => string>();

const envKeys = [
  "OIDC_ISSUER",
  "OIDC_CLIENT_ID",
  "OIDC_CLIENT_SECRET",
  "OIDC_DESKTOP_CLIENT_ID",
  "INTERNAL_DATABASE_URL",
  "JACKSON_ENCRYPTION_KEY",
  "JACKSON_SAML_METADATA_XML",
  "JACKSON_SAML_METADATA_PATH",
  "JACKSON_TENANT",
  "JACKSON_PRODUCT",
  "JACKSON_WEB_PRODUCT",
  "JACKSON_DESKTOP_PRODUCT",
  "JACKSON_DESKTOP_REDIRECT_URL",
];

const clearEnv = (): void => {
  for (const key of envKeys) {
    delete process.env[key];
  }
};

const loadModule = async () => {
  vi.doMock("../index", () => ({
    getJackson: mockGetJackson,
    isJacksonConfigured: mockIsJacksonConfigured,
    resolveExternalUrl: mockResolveExternalUrl,
  }));

  return import("../oidc-clients");
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  clearEnv();

  mockReadFile.mockResolvedValue("<xml-from-file />");
  mockIsJacksonConfigured.mockReturnValue(false);
  mockResolveExternalUrl.mockReturnValue("https://internal.example.com");
  mockGetJackson.mockResolvedValue({
    connectionAPIController: {
      createSAMLConnection: mockCreateSAMLConnection,
    },
  });
  mockCreateSAMLConnection.mockImplementation(async (args) => ({
    clientID: `${args.product}-client`,
    clientSecret: `${args.product}-secret`,
  }));
});

const configureCustomJacksonAutoEnv = (): void => {
  process.env.INTERNAL_DATABASE_URL = "postgresql://localhost/tumiki";
  process.env.JACKSON_ENCRYPTION_KEY = "x".repeat(32);
  process.env.JACKSON_SAML_METADATA_XML = "<xml />";
  process.env.JACKSON_TENANT = "tenant-001";
  process.env.JACKSON_WEB_PRODUCT = "tumiki-web";
  process.env.JACKSON_DESKTOP_PRODUCT = "tumiki-desktop";
  process.env.JACKSON_DESKTOP_REDIRECT_URL = "tumiki://auth/callback";
  mockIsJacksonConfigured.mockReturnValue(true);
};

describe("oidc-clients", () => {
  test("明示的OIDC設定をJackson自動設定より優先する", async () => {
    process.env.OIDC_ISSUER = "https://idp.example.com";
    process.env.OIDC_CLIENT_ID = "web-client";
    process.env.OIDC_CLIENT_SECRET = "web-secret";
    process.env.OIDC_DESKTOP_CLIENT_ID = "desktop-client";
    process.env.JACKSON_SAML_METADATA_XML = "<xml />";
    mockIsJacksonConfigured.mockReturnValue(true);
    const { ensureJacksonOidcClients, isExplicitOidcConfigured } =
      await loadModule();

    await expect(ensureJacksonOidcClients()).resolves.toStrictEqual({
      OIDC_ISSUER: "https://idp.example.com",
      OIDC_CLIENT_ID: "web-client",
      OIDC_CLIENT_SECRET: "web-secret",
      OIDC_DESKTOP_CLIENT_ID: "desktop-client",
    });
    expect(isExplicitOidcConfigured()).toBe(true);
    expect(mockCreateSAMLConnection).not.toHaveBeenCalled();
  });

  test("Jackson自動設定が未設定ならエラーを返す", async () => {
    mockIsJacksonConfigured.mockReturnValue(false);
    const { ensureJacksonOidcClients, isJacksonAutoOidcConfigured } =
      await loadModule();

    expect(isJacksonAutoOidcConfigured()).toBe(false);
    await expect(ensureJacksonOidcClients()).rejects.toThrow(
      "OIDC is not configured",
    );
  });

  test("Jackson自動設定では並行呼び出しを1回のconnection生成にまとめる", async () => {
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
    process.env.INTERNAL_DATABASE_URL = "postgresql://localhost/tumiki";
    process.env.JACKSON_ENCRYPTION_KEY = "x".repeat(32);
    process.env.JACKSON_SAML_METADATA_PATH = "/tmp/idp-metadata.xml";
    mockIsJacksonConfigured.mockReturnValue(true);
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

  test("Jackson自動設定の生成失敗後は次回呼び出しで再試行できる", async () => {
    process.env.INTERNAL_DATABASE_URL = "postgresql://localhost/tumiki";
    process.env.JACKSON_ENCRYPTION_KEY = "x".repeat(32);
    process.env.JACKSON_SAML_METADATA_XML = "<xml />";
    mockIsJacksonConfigured.mockReturnValue(true);
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
