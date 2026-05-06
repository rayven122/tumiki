import { z } from "zod";
import { INTERNAL_MANAGER_SECRET_MIN_LENGTH } from "./auth/secret-constants";

/** セットアップ画面向けユーザー表示用スキーマ（日本語エラーメッセージ） */
export const setupOidcSchema = z.object({
  INTERNAL_DATABASE_URL: z.string().min(1, "未設定"),
  TUMIKI_INTERNAL_MANAGER_SECRET_KEY: z
    .string()
    .min(
      INTERNAL_MANAGER_SECRET_MIN_LENGTH,
      `${INTERNAL_MANAGER_SECRET_MIN_LENGTH}文字以上が必要です`,
    ),
  TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY: z
    .string()
    .min(1, "base64 PKCS8 private PEM が必要です"),
  TUMIKI_INTERNAL_MANAGER_PUBLIC_URL: z
    .string()
    .url("URL 形式で設定してください"),
  // セットアップ画面の表示用仮想フィールド。実在する env ではない。
  TUMIKI_INTERNAL_MANAGER_UPSTREAM: z
    .string()
    .min(1, "SAML metadata または OIDC upstream 設定が必要です"),
});

const hasJacksonEncryptionSecret = (): boolean =>
  (process.env.TUMIKI_INTERNAL_MANAGER_SECRET_KEY ?? "").length >=
    INTERNAL_MANAGER_SECRET_MIN_LENGTH ||
  (process.env.JACKSON_ENCRYPTION_KEY ?? "").length >=
    INTERNAL_MANAGER_SECRET_MIN_LENGTH;

const hasJacksonOidcSigningSecret = (): boolean =>
  (process.env.TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY ?? "").length > 0 ||
  ((process.env.JACKSON_OIDC_PRIVATE_KEY ?? "").length > 0 &&
    (process.env.JACKSON_OIDC_PUBLIC_KEY ?? "").length > 0);

const hasInternalManagerPublicUrl = (): boolean =>
  (process.env.TUMIKI_INTERNAL_MANAGER_PUBLIC_URL ?? "").length > 0 ||
  (process.env.NEXTAUTH_URL_INTERNAL_MANAGER ?? "").length > 0 ||
  (process.env.NEXTAUTH_URL ?? "").length > 0;

// secrets.ts は server-only の実値解決を担当し、env.ts はセットアップ画面用の
// lightweight な存在確認だけを担当する。循環依存を避けるため重複実装にしている。
export const hasSamlUpstream = (): boolean =>
  (process.env.TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML ?? "").length > 0 ||
  (process.env.TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH ?? "").length > 0 ||
  (process.env.JACKSON_SAML_METADATA_XML ?? "").length > 0 ||
  (process.env.JACKSON_SAML_METADATA_PATH ?? "").length > 0;

export const hasOidcUpstream = (): boolean =>
  ((process.env.TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL ?? "").length > 0 ||
    (process.env.OIDC_ISSUER ?? "").length > 0) &&
  ((process.env.TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID ?? "").length > 0 ||
    (process.env.OIDC_CLIENT_ID ?? "").length > 0) &&
  ((process.env.TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET ?? "").length > 0 ||
    (process.env.OIDC_CLIENT_SECRET ?? "").length > 0);

export const isJacksonAutoOidcConfigured = (): boolean => {
  const hasSaml = hasSamlUpstream();
  const hasOidc = hasOidcUpstream();
  // SAML と OIDC のどちらか一方だけ設定されている場合のみ有効。
  const hasExactlyOneUpstream = hasSaml !== hasOidc;
  return (
    (process.env.INTERNAL_DATABASE_URL ?? "").length > 0 &&
    hasJacksonEncryptionSecret() &&
    hasJacksonOidcSigningSecret() &&
    hasInternalManagerPublicUrl() &&
    hasExactlyOneUpstream
  );
};

// proxy.ts の既存 import 互換。現在の OIDC 設定判定は Jackson broker 経由のみ。
export { isJacksonAutoOidcConfigured as isOidcConfigured };
