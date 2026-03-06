import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { determineRedirectUrl, getBaseUrl } from "~/lib/auth/redirect-utils";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { getKeycloakEnv } from "~/lib/env";

type SignUpPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

/**
 * 新規登録ページ
 * 直接Keycloakの新規登録画面にリダイレクト
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const orgSlug = getSessionInfo(session).organizationSlug;

  // リダイレクト先を決定（新規ユーザーフラグをtrue）
  const redirectUrl = determineRedirectUrl(callbackUrl, orgSlug, true);

  // 既にログイン済みの場合は、リダイレクト先へ
  if (session?.user) {
    redirect(redirectUrl);
  }

  // Keycloakの新規登録URLを構築
  const keycloakEnv = getKeycloakEnv();
  const baseUrl = getBaseUrl();
  const callbackUri = `${baseUrl}/api/auth/callback/keycloak`;

  // Keycloak新規登録URLを構築
  // 注: URL.searchParams.set() は自動的にエンコードするため、
  // encodeURIComponent() は不要（二重エンコード防止）
  const registrationUrl = new URL(
    `${keycloakEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/registrations`,
  );
  registrationUrl.searchParams.set("client_id", keycloakEnv.KEYCLOAK_CLIENT_ID);
  registrationUrl.searchParams.set("response_type", "code");
  registrationUrl.searchParams.set("redirect_uri", callbackUri);
  registrationUrl.searchParams.set("scope", "openid");

  redirect(registrationUrl.toString());
}
