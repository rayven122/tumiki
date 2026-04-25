import { z } from "zod";

/**
 * OIDC認証用の環境変数スキーマ
 * Entra ID / Google Workspace / Okta / Keycloak など任意のOIDCプロバイダーに対応
 */
const oidcEnvSchema = z.object({
  OIDC_CLIENT_ID: z.string().min(1, "OIDC_CLIENT_ID is required"),
  OIDC_CLIENT_SECRET: z.string().min(1, "OIDC_CLIENT_SECRET is required"),
  OIDC_ISSUER: z.string().url("OIDC_ISSUER must be a valid URL"),
});

/**
 * OIDC環境変数を検証して取得
 * CI環境ではダミー値を使用
 */
export const getOidcEnv = () => {
  const isCI = process.env.CI === "true";

  // 空文字列もフォールスルーさせるため、明示的に空文字チェックを行う
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const issuer = process.env.OIDC_ISSUER;

  const result = oidcEnvSchema.safeParse({
    OIDC_CLIENT_ID:
      clientId !== "" ? clientId : isCI ? "dummy-client-id" : undefined,
    OIDC_CLIENT_SECRET:
      clientSecret !== ""
        ? clientSecret
        : isCI
          ? "dummy-client-secret"
          : undefined,
    OIDC_ISSUER:
      issuer !== "" ? issuer : isCI ? "https://dummy.oidc.local" : undefined,
  });

  if (!result.success) {
    throw new Error(
      `OIDC environment variables validation failed: ${result.error.message}`,
    );
  }

  return result.data;
};
