import { z } from "zod";

/**
 * Keycloak認証用の環境変数スキーマ
 */
const keycloakEnvSchema = z.object({
  KEYCLOAK_CLIENT_ID: z.string().min(1, "KEYCLOAK_CLIENT_ID is required"),
  KEYCLOAK_CLIENT_SECRET: z
    .string()
    .min(1, "KEYCLOAK_CLIENT_SECRET is required"),
  KEYCLOAK_ISSUER: z.string().url("KEYCLOAK_ISSUER must be a valid URL"),
});

/**
 * Keycloak環境変数を検証して取得
 * 環境変数が未設定または不正な場合はエラーをスロー
 * CI環境ではダミー値を使用（ビルド時のみ必要、実際の認証は行われない）
 */
export const getKeycloakEnv = () => {
  // CI環境ではダミー値を使用
  const isCI = process.env.CI === "true" || process.env.VERCEL === "1";

  const result = keycloakEnvSchema.safeParse({
    KEYCLOAK_CLIENT_ID:
      process.env.KEYCLOAK_CLIENT_ID ?? (isCI ? "dummy-client-id" : undefined),
    KEYCLOAK_CLIENT_SECRET:
      process.env.KEYCLOAK_CLIENT_SECRET ??
      (isCI ? "dummy-client-secret" : undefined),
    KEYCLOAK_ISSUER:
      process.env.KEYCLOAK_ISSUER ??
      (isCI ? "https://dummy.keycloak.local/realms/tumiki" : undefined),
  });

  if (!result.success) {
    throw new Error(
      `Keycloak environment variables validation failed: ${result.error.message}`,
    );
  }

  return result.data;
};
