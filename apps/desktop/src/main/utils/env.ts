import { z } from "zod";
import * as logger from "./logger";

/**
 * Keycloak認証用の環境変数スキーマ（デスクトップアプリ用）
 * デスクトップアプリはPublic Clientのため、client_secretは不要（PKCEで保護）
 */
const keycloakEnvSchema = z.object({
  KEYCLOAK_ISSUER: z.string().url("KEYCLOAK_ISSUER must be a valid URL"),
  KEYCLOAK_DESKTOP_CLIENT_ID: z
    .string()
    .min(1, "KEYCLOAK_DESKTOP_CLIENT_ID is required"),
});

/**
 * Keycloak環境変数をオプショナルで取得
 * 環境変数が未設定または不正な場合はnullを返す（バリデーションエラーはログ出力）
 */
export const getKeycloakEnvOptional = (): z.infer<
  typeof keycloakEnvSchema
> | null => {
  const result = keycloakEnvSchema.safeParse({
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_DESKTOP_CLIENT_ID: process.env.KEYCLOAK_DESKTOP_CLIENT_ID,
  });

  if (!result.success) {
    // 環境変数が1つでも設定されている場合はバリデーションエラーを警告
    if (process.env.KEYCLOAK_ISSUER || process.env.KEYCLOAK_DESKTOP_CLIENT_ID) {
      logger.warn("Keycloak environment variables are invalid", {
        errors: result.error.flatten().fieldErrors,
      });
    }
    return null;
  }

  return result.data;
};
