import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSessionInfo } from "~/lib/auth/session-utils";

type SignInPageProps = {
  searchParams: Promise<{ inviteToken?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const { inviteToken } = await searchParams;
  const orgSlug = getSessionInfo(session).organizationSlug;

  // inviteTokenがある場合は招待ページへ、なければデフォルト組織へ
  let redirectUrl: string;
  if (inviteToken) {
    redirectUrl = `/invite/${inviteToken}`;
  } else {
    // 組織情報がない場合はオンボーディングへ（初回ログインフラグ付き）
    redirectUrl = orgSlug ? `/${orgSlug}/mcps` : "/onboarding?first=true";
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
