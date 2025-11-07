import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <AuthCard title="アカウント作成" description="Googleアカウントで新規登録">
      <GoogleSignInButton callbackUrl="/onboarding" label="Googleで登録" />

      <div className="text-muted-foreground text-center text-sm">
        <span>すでにアカウントをお持ちの方は </span>
        <Link
          href="/signin"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          ログイン
        </Link>
      </div>
    </AuthCard>
  );
}
