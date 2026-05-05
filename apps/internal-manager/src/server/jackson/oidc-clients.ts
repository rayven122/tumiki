import { readFile } from "node:fs/promises";
import { z } from "zod";
import { hasSamlUpstream, isJacksonAutoOidcConfigured } from "~/lib/env";
import { getJackson, resolveExternalUrl } from "./index";
import { registerJacksonResetHook } from "./reset-hooks";
export { isJacksonAutoOidcConfigured } from "~/lib/env";

export type ResolvedOidcConfig = {
  OIDC_ISSUER: string;
  OIDC_CLIENT_ID: string;
  OIDC_CLIENT_SECRET: string;
  OIDC_DESKTOP_CLIENT_ID: string;
};

export const DEFAULT_DESKTOP_REDIRECT_URL = "tumiki://auth/callback";

export class OidcNotConfiguredError extends Error {
  override readonly name = "OidcNotConfiguredError";
}

class UpstreamNotConfiguredError extends Error {
  override readonly name = "UpstreamNotConfiguredError";
}

class UpstreamConflictError extends Error {
  override readonly name = "UpstreamConflictError";
}

type JacksonConnection = {
  clientID: string;
  clientSecret: string;
};

type UpstreamConfig =
  | { type: "saml"; rawMetadata: string }
  | {
      type: "oidc";
      oidcDiscoveryUrl: string;
      oidcClientId: string;
      oidcClientSecret: string;
    };

const jacksonConnectionSchema = z.object({
  clientID: z.string().min(1),
  clientSecret: z.string().min(1),
});

let resolvedConfig: ResolvedOidcConfig | null = null;
let clientsPromise: Promise<ResolvedOidcConfig> | null = null;

export const resetOidcClients = (): void => {
  resolvedConfig = null;
  clientsPromise = null;
};

registerJacksonResetHook(resetOidcClients);

const getProductNames = (): { webProduct: string; desktopProduct: string } => {
  const webProduct =
    process.env.JACKSON_WEB_PRODUCT ?? process.env.JACKSON_PRODUCT ?? "tumiki";
  const desktopProduct =
    process.env.JACKSON_DESKTOP_PRODUCT ?? `${webProduct}-desktop`;
  return { webProduct, desktopProduct };
};

const getDesktopRedirectUrl = (): string =>
  process.env.JACKSON_DESKTOP_REDIRECT_URL ?? DEFAULT_DESKTOP_REDIRECT_URL;

const OIDC_DISCOVERY_PATH_RE = /(^|\/)\.well-known\/openid-configuration$/;

const toDiscoveryUrl = (issuerOrDiscoveryUrl: string): string => {
  const parsed = new URL(issuerOrDiscoveryUrl);
  if (OIDC_DISCOVERY_PATH_RE.test(parsed.pathname)) {
    return parsed.toString();
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/.well-known/openid-configuration`;
  return parsed.toString();
};

const getRawMetadata = async (): Promise<string> => {
  const rawMetadata =
    process.env.TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML ??
    process.env.JACKSON_SAML_METADATA_XML;
  if (rawMetadata) return rawMetadata;

  const metadataPath =
    process.env.TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH ??
    process.env.JACKSON_SAML_METADATA_PATH;
  if (metadataPath) return readFile(metadataPath, "utf-8");

  throw new UpstreamNotConfiguredError(
    "TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML or TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH is required for SAML upstream provisioning",
  );
};

const getOidcUpstreamConfig = (): UpstreamConfig | null => {
  const discoveryUrl =
    process.env.TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL ??
    process.env.OIDC_ISSUER;
  const clientId =
    process.env.TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID ??
    process.env.OIDC_CLIENT_ID;
  const clientSecret =
    process.env.TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET ??
    process.env.OIDC_CLIENT_SECRET;

  if (!discoveryUrl || !clientId || !clientSecret) return null;

  return {
    type: "oidc",
    oidcDiscoveryUrl: toDiscoveryUrl(discoveryUrl),
    oidcClientId: clientId,
    oidcClientSecret: clientSecret,
  };
};

const getUpstreamConfig = async (): Promise<UpstreamConfig> => {
  const hasSaml = hasSamlUpstream();
  const oidc = getOidcUpstreamConfig();

  if (hasSaml && oidc) {
    throw new UpstreamConflictError(
      "Configure either SAML upstream or OIDC upstream, not both",
    );
  }

  if (oidc) return oidc;
  if (hasSaml) return { type: "saml", rawMetadata: await getRawMetadata() };

  throw new UpstreamNotConfiguredError(
    "TUMIKI_INTERNAL_MANAGER_SAML_* or TUMIKI_INTERNAL_MANAGER_OIDC_* is required for automatic Jackson OIDC client provisioning",
  );
};

const ensureConnection = async ({
  tenant,
  product,
  redirectUrl,
  upstream,
}: {
  tenant: string;
  product: string;
  redirectUrl: string;
  upstream: UpstreamConfig;
}): Promise<JacksonConnection> => {
  const { connectionAPIController } = await getJackson();

  const commonParams = {
    tenant,
    product,
    defaultRedirectUrl: redirectUrl,
    // Jackson API は redirectUrl を JSON 配列文字列（複数URL許容）として受け付ける。
    redirectUrl: JSON.stringify([redirectUrl]),
  };

  const connection = jacksonConnectionSchema.parse(
    upstream.type === "saml"
      ? await connectionAPIController.createSAMLConnection({
          ...commonParams,
          rawMetadata: upstream.rawMetadata,
        })
      : await connectionAPIController.createOIDCConnection({
          ...commonParams,
          oidcDiscoveryUrl: upstream.oidcDiscoveryUrl,
          oidcClientId: upstream.oidcClientId,
          oidcClientSecret: upstream.oidcClientSecret,
        }),
  );

  return {
    clientID: connection.clientID,
    clientSecret: connection.clientSecret,
  };
};

export const ensureJacksonOidcClients =
  async (): Promise<ResolvedOidcConfig> => {
    if (resolvedConfig) return resolvedConfig;
    if (clientsPromise) return clientsPromise;

    clientsPromise = (async () => {
      const upstream = await getUpstreamConfig().catch((error: unknown) => {
        if (error instanceof UpstreamNotConfiguredError) {
          return null;
        }
        const detail = error instanceof Error ? error.message : String(error);
        throw new OidcNotConfiguredError(
          error instanceof UpstreamConflictError
            ? detail
            : `OIDC upstream config failed: ${detail}`,
        );
      });

      if (!upstream || !isJacksonAutoOidcConfigured()) {
        throw new OidcNotConfiguredError(
          "OIDC is not configured. Configure Jackson provisioning with TUMIKI_INTERNAL_MANAGER_SECRET_KEY, TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY, TUMIKI_INTERNAL_MANAGER_PUBLIC_URL, and TUMIKI_INTERNAL_MANAGER_SAML_* or TUMIKI_INTERNAL_MANAGER_OIDC_*.",
        );
      }

      const tenant = process.env.JACKSON_TENANT ?? "default";
      const { webProduct, desktopProduct } = getProductNames();
      const externalUrl = resolveExternalUrl();

      // Jackson 自動設定は起動後に upstream IdP 設定が変わらない前提でプロセス内キャッシュする。
      // create*Connection は Jackson 側で同一 tenant/product の connection を upsert する。
      const webConnection = await ensureConnection({
        tenant,
        product: webProduct,
        redirectUrl: `${externalUrl}/api/auth/callback/oidc`,
        upstream,
      });
      const desktopConnection = await ensureConnection({
        tenant,
        product: desktopProduct,
        redirectUrl: getDesktopRedirectUrl(),
        upstream,
      });

      const config = {
        OIDC_ISSUER: externalUrl,
        OIDC_CLIENT_ID: webConnection.clientID,
        OIDC_CLIENT_SECRET: webConnection.clientSecret,
        // Desktop は PKCE public client のため、Jackson が生成する clientSecret は使用しない。
        OIDC_DESKTOP_CLIENT_ID: desktopConnection.clientID,
      };
      resolvedConfig = config;
      return config;
    })().finally(() => {
      // 成功後は resolvedConfig にキャッシュ済み。失敗後は次回呼び出しで再試行させる。
      clientsPromise = null;
    });

    return clientsPromise;
  };
