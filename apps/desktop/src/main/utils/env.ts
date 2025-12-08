import { z } from "zod";

/**
 * Keycloak認証用の環境変数スキーマ（デスクトップアプリ用）
 */
const keycloakEnvSchema = z.object({
  KEYCLOAK_ISSUER: z.string().url("KEYCLOAK_ISSUER must be a valid URL"),
  KEYCLOAK_CLIENT_ID: z.string().min(1, "KEYCLOAK_CLIENT_ID is required"),
  KEYCLOAK_CLIENT_SECRET: z
    .string()
    .min(1, "KEYCLOAK_CLIENT_SECRET is required"),
});

/**
 * Keycloak環境変数を検証して取得
 * 環境変数が未設定または不正な場合はエラーをスロー
 */
export const getKeycloakEnv = () => {
  const result = keycloakEnvSchema.safeParse({
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
  });

  if (!result.success) {
    throw new Error(
      `Keycloak environment variables validation failed: ${result.error.message}`,
    );
  }

  return result.data;
};
