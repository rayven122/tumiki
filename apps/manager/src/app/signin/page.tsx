import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

export default async function SignInPage() {
  const session = await auth();

  // 既にログイン済みの場合は、デフォルト組織のMCPページにリダイレクト
  if (session?.user) {
    try {
      const defaultOrg = await api.organization.getDefaultOrganization.query();
      if (defaultOrg?.slug) {
        redirect(`/${defaultOrg.slug}/mcps`);
      }
    } catch (error) {
      // エラーの場合はオンボーディングへ
      redirect("/onboarding");
    }
  }

  // ログイン後は専用のコールバックページへリダイレクト
  const callbackUrl = "/auth/callback";

  return (
    <AuthCard
      title="おかえりなさい"
      description="アカウントにログインしてください"
    >
      <GoogleSignInButton callbackUrl={callbackUrl} label="Googleでログイン" />

      <div className="text-muted-foreground text-center text-sm">
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
