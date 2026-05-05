import { readFile } from "node:fs/promises";
import { z } from "zod";
import { getJackson, isJacksonConfigured, resolveExternalUrl } from "./index";

export type ResolvedOidcConfig = {
  OIDC_ISSUER: string;
  OIDC_CLIENT_ID: string;
  OIDC_CLIENT_SECRET: string;
  OIDC_DESKTOP_CLIENT_ID: string;
};

type JacksonConnection = {
  clientID: string;
  clientSecret: string;
};

const jacksonConnectionSchema = z.object({
  clientID: z.string().min(1),
  clientSecret: z.string().min(1),
});

let resolvedConfig: ResolvedOidcConfig | null = null;
let clientsPromise: Promise<ResolvedOidcConfig> | null = null;

export const isExplicitOidcConfigured = (): boolean =>
  ["OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_ISSUER"].every(
    (key) => (process.env[key] ?? "").length > 0,
  );

export const isJacksonAutoOidcConfigured = (): boolean =>
  isJacksonConfigured() &&
  ((process.env.JACKSON_SAML_METADATA_XML ?? "").length > 0 ||
    (process.env.JACKSON_SAML_METADATA_PATH ?? "").length > 0);

const getProductNames = () => {
  const webProduct =
    process.env.JACKSON_WEB_PRODUCT ?? process.env.JACKSON_PRODUCT ?? "tumiki";
  const desktopProduct =
    process.env.JACKSON_DESKTOP_PRODUCT ?? `${webProduct}-desktop`;
  return { webProduct, desktopProduct };
};

const getDesktopRedirectUrl = (): string =>
  process.env.JACKSON_DESKTOP_REDIRECT_URL ?? "tumiki://auth/callback";

const getRawMetadata = async (): Promise<string> => {
  const rawMetadata = process.env.JACKSON_SAML_METADATA_XML;
  if (rawMetadata) return rawMetadata;

  const metadataPath = process.env.JACKSON_SAML_METADATA_PATH;
  if (metadataPath) return readFile(metadataPath, "utf-8");

  throw new Error(
    "JACKSON_SAML_METADATA_XML or JACKSON_SAML_METADATA_PATH is required for automatic Jackson OIDC client provisioning",
  );
};

const ensureConnection = async ({
  tenant,
  product,
  redirectUrl,
  rawMetadata,
}: {
  tenant: string;
  product: string;
  redirectUrl: string;
  rawMetadata: string;
}): Promise<JacksonConnection> => {
  const { connectionAPIController } = await getJackson();

  const connection = jacksonConnectionSchema.parse(
    await connectionAPIController.createSAMLConnection({
      tenant,
      product,
      rawMetadata,
      defaultRedirectUrl: redirectUrl,
      redirectUrl: JSON.stringify([redirectUrl]),
    }),
  );

  return {
    clientID: connection.clientID,
    clientSecret: connection.clientSecret,
  };
};

const getExplicitOidcConfig = (): ResolvedOidcConfig | null => {
  const issuer = process.env.OIDC_ISSUER ?? "";
  const clientId = process.env.OIDC_CLIENT_ID ?? "";
  const clientSecret = process.env.OIDC_CLIENT_SECRET ?? "";
  if (!issuer || !clientId || !clientSecret) return null;

  const desktopClientId =
    process.env.OIDC_DESKTOP_CLIENT_ID ?? process.env.OIDC_CLIENT_ID;
  if (!desktopClientId) return null;

  // 明示的な OIDC env はローカル Keycloak などの動的切り替えを考慮してキャッシュしない。
  return {
    OIDC_ISSUER: issuer,
    OIDC_CLIENT_ID: clientId,
    OIDC_CLIENT_SECRET: clientSecret,
    OIDC_DESKTOP_CLIENT_ID: desktopClientId,
  };
};

export const ensureJacksonOidcClients =
  async (): Promise<ResolvedOidcConfig> => {
    const explicit = getExplicitOidcConfig();
    if (explicit) return explicit;

    if (resolvedConfig) return resolvedConfig;
    if (clientsPromise) return clientsPromise;

    clientsPromise = (async () => {
      if (!isJacksonAutoOidcConfigured()) {
        throw new Error(
          "OIDC is not configured. Set OIDC_* directly or configure Jackson automatic provisioning with JACKSON_SAML_METADATA_XML/JACKSON_SAML_METADATA_PATH.",
        );
      }

      const tenant = process.env.JACKSON_TENANT ?? "default";
      const { webProduct, desktopProduct } = getProductNames();
      const externalUrl = resolveExternalUrl();
      const rawMetadata = await getRawMetadata();

      // Jackson 自動設定は起動後に SAML IdP 設定が変わらない前提でプロセス内キャッシュする。
      // createSAMLConnection は Jackson 側で同一 tenant/product の connection を upsert する。
      const webConnection = await ensureConnection({
        tenant,
        product: webProduct,
        redirectUrl: `${externalUrl}/api/auth/callback/oidc`,
        rawMetadata,
      });
      const desktopConnection = await ensureConnection({
        tenant,
        product: desktopProduct,
        redirectUrl: getDesktopRedirectUrl(),
        rawMetadata,
      });

      const config = {
        OIDC_ISSUER: externalUrl,
        OIDC_CLIENT_ID: webConnection.clientID,
        OIDC_CLIENT_SECRET: webConnection.clientSecret,
        OIDC_DESKTOP_CLIENT_ID: desktopConnection.clientID,
      };
      resolvedConfig = config;
      return config;
    })().finally(() => {
      clientsPromise = null;
    });

    return clientsPromise;
  };
