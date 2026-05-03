import "server-only";
import { env } from "@/lib/env";

/** Keycloak Admin REST API クライアント（fetch ベース） */

type TokenResponse = { access_token: string; expires_in: number };
type ClientRepresentation = { id: string };
type SecretResponse = { value: string };

let cachedToken: { token: string; expiresAt: number } | null = null;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: "admin",
    password: env.KEYCLOAK_ADMIN_PASSWORD,
  });

  const res = await fetch(
    `${env.KEYCLOAK_ADMIN_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!res.ok) {
    throw new Error(`Keycloak admin login failed: ${res.status}`);
  }

  const data = (await res.json()) as TokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 30) * 1000,
  };
  return data.access_token;
};

const apiFetch = async (
  path: string,
  init: RequestInit = {},
): Promise<Response> => {
  const token = await getAccessToken();
  return fetch(`${env.KEYCLOAK_ADMIN_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * テナント用 Keycloak Realm を作成する。
 * - web クライアント（internal-manager）: confidential, redirect `https://{domain}/*`
 * - desktop クライアント（internal-manager-desktop）: public, PKCE S256, redirect `tumiki://auth/callback`
 * 戻り値: web クライアントの client secret
 */
export const createTenantRealm = async (params: {
  slug: string;
  domain: string;
}): Promise<{ clientSecret: string }> => {
  const { slug, domain } = params;

  // Realm 作成
  const realmRes = await apiFetch("/admin/realms", {
    method: "POST",
    body: JSON.stringify({
      realm: slug,
      displayName: slug,
      enabled: true,
    }),
  });
  if (!realmRes.ok) {
    const text = await realmRes.text();
    throw new Error(`createRealm(${slug}) failed: ${realmRes.status} ${text}`);
  }

  // Confidential client（internal-manager）作成
  const webClientRes = await apiFetch(`/admin/realms/${slug}/clients`, {
    method: "POST",
    body: JSON.stringify({
      clientId: "internal-manager",
      name: "internal-manager",
      enabled: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      publicClient: false,
      rootUrl: `https://${domain}`,
      redirectUris: [`https://${domain}/*`],
      webOrigins: [`https://${domain}`],
    }),
  });
  if (!webClientRes.ok) {
    const text = await webClientRes.text();
    throw new Error(
      `createWebClient(${slug}) failed: ${webClientRes.status} ${text}`,
    );
  }

  // 作成した web クライアントの内部 ID を取得
  const clientsRes = await apiFetch(
    `/admin/realms/${slug}/clients?clientId=internal-manager`,
  );
  if (!clientsRes.ok) {
    const text = await clientsRes.text();
    throw new Error(
      `getClientId(${slug}) failed: ${clientsRes.status} ${text}`,
    );
  }
  const clients = (await clientsRes.json()) as ClientRepresentation[];
  const webClientId = clients[0]?.id;
  if (!webClientId) {
    throw new Error(`internal-manager client not found in realm ${slug}`);
  }

  // Client secret 取得
  const secretRes = await apiFetch(
    `/admin/realms/${slug}/clients/${webClientId}/client-secret`,
  );
  if (!secretRes.ok) {
    const text = await secretRes.text();
    throw new Error(
      `getClientSecret(${slug}) failed: ${secretRes.status} ${text}`,
    );
  }
  const secretData = (await secretRes.json()) as SecretResponse;
  const clientSecret = secretData.value;

  // Public PKCE client（internal-manager-desktop）作成
  const desktopClientRes = await apiFetch(`/admin/realms/${slug}/clients`, {
    method: "POST",
    body: JSON.stringify({
      clientId: "internal-manager-desktop",
      name: "internal-manager-desktop",
      enabled: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      publicClient: true,
      redirectUris: ["tumiki://auth/callback"],
      attributes: {
        "pkce.code.challenge.method": "S256",
      },
    }),
  });
  if (!desktopClientRes.ok) {
    const text = await desktopClientRes.text();
    throw new Error(
      `createDesktopClient(${slug}) failed: ${desktopClientRes.status} ${text}`,
    );
  }

  return { clientSecret };
};

/**
 * テナント用 Realm を削除する（ロールバック・テナント削除用）。
 * 404（存在しない）は無視してベストエフォートで処理する。
 */
export const deleteTenantRealm = async (slug: string): Promise<void> => {
  const res = await apiFetch(`/admin/realms/${slug}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`deleteRealm(${slug}) failed: ${res.status} ${text}`);
  }
};
