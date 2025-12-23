import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSessionInfo } from "~/lib/auth/session-utils";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const orgSlug = getSessionInfo(session).organizationSlug;

  // callbackUrlのバリデーション（サインインループを防ぐ）
  const dangerousPaths = ["/signin", "/signup", "/api/auth/"];
  const validatedCallbackUrl =
    callbackUrl && !dangerousPaths.some((path) => callbackUrl.startsWith(path))
      ? callbackUrl
      : null;

  // リダイレクト先の優先順位:
  // 1. デフォルト組織ページ
  // 2. callbackUrl
  // 3. 初回ユーザー（org_slug なし）
  let redirectUrl: string;
  if (orgSlug) {
    redirectUrl = `/${orgSlug}/mcps`;
  } else if (validatedCallbackUrl) {
    redirectUrl = validatedCallbackUrl;
  } else {
    redirectUrl = "/onboarding?first=true";
  }

  // 既にログイン済みの場合は、リダイレクト先へ
  if (session?.user) {
    redirect(redirectUrl);
  }

  return (
    <AuthCard
      title="おかえりなさい"
      description="アカウントにログインしてください"
    >
      <GoogleSignInButton callbackUrl={redirectUrl} label="Googleでログイン" />

      <div className="text-center text-sm text-slate-600">
        <span>アカウントをお持ちでない方は </span>
        <Link
          href="/signup"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          新規登録
        </Link>
      </div>
    </AuthCard>
  );
}
