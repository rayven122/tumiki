import { z } from "zod";

/** セットアップ画面向けユーザー表示用スキーマ（日本語エラーメッセージ） */
export const setupOidcSchema = z.object({
  INTERNAL_DATABASE_URL: z.string().min(1, "未設定"),
  JACKSON_ENCRYPTION_KEY: z.string().min(32, "32文字以上が必要です"),
  JACKSON_SAML_METADATA: z
    .string()
    .min(1, "metadata XML または path が必要です"),
});

/** OIDC必須環境変数がすべて設定されているか確認（throw しない） */
export const isOidcConfigured = (): boolean =>
  ["OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_ISSUER"].every(
    (key) => (process.env[key] ?? "").length > 0,
  ) ||
  ((process.env.INTERNAL_DATABASE_URL ?? "").length > 0 &&
    (process.env.JACKSON_ENCRYPTION_KEY ?? "").length >= 32 &&
    ((process.env.JACKSON_SAML_METADATA_XML ?? "").length > 0 ||
      (process.env.JACKSON_SAML_METADATA_PATH ?? "").length > 0));
