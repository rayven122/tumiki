import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { determineRedirectUrl } from "~/lib/auth/redirect-utils";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { getKeycloakEnv } from "~/utils/env";

type SignUpPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

/**
 * アプリケーションのベースURLを取得
 * 環境変数が未設定の場合はエラーをスロー（開発環境のみフォールバック許可）
 */
const getBaseUrl = (): string => {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    // 開発環境のみフォールバック許可
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000";
    }
    throw new Error("NEXTAUTH_URL environment variable is required");
  }
  return baseUrl;
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
  const callbackUrlEncoded = encodeURIComponent(
    `${baseUrl}/api/auth/callback/keycloak`,
  );

  // Keycloak新規登録URLを構築
  const registrationUrl = new URL(
    `${keycloakEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/registrations`,
  );
  registrationUrl.searchParams.set("client_id", keycloakEnv.KEYCLOAK_CLIENT_ID);
  registrationUrl.searchParams.set("response_type", "code");
  registrationUrl.searchParams.set("redirect_uri", callbackUrlEncoded);
  registrationUrl.searchParams.set("scope", "openid");

  redirect(registrationUrl.toString());
}
