import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  // セッションから直接組織slugを取得
  const orgSlug = session?.user.organizationSlug;

  // 組織情報がない場合はオンボーディングへ（初回ログインフラグ付き）
  const redirectUrl = orgSlug ? `/${orgSlug}/mcps` : "/onboarding?first=true";

  // 既にログイン済みの場合は、デフォルト組織のMCPページにリダイレクト
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
