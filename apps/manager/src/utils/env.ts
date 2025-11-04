import { z } from "zod";

/**
 * Keycloak認証用の環境変数スキーマ
 */
const keycloakEnvSchema = z.object({
  KEYCLOAK_ID: z.string().min(1, "KEYCLOAK_ID is required"),
  KEYCLOAK_SECRET: z.string().min(1, "KEYCLOAK_SECRET is required"),
  KEYCLOAK_ISSUER: z.string().url("KEYCLOAK_ISSUER must be a valid URL"),
});

/**
 * Keycloak環境変数を検証して取得
 * 環境変数が未設定または不正な場合はエラーをスロー
 */
export const getKeycloakEnv = () => {
  const result = keycloakEnvSchema.safeParse({
    KEYCLOAK_ID: process.env.KEYCLOAK_ID,
    KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
  });

  if (!result.success) {
    throw new Error(
      `Keycloak environment variables validation failed: ${result.error.message}`,
    );
  }

  return result.data;
};
