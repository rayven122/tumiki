import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";

type SignUpPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { callbackUrl } = await searchParams;

  // callbackUrlのバリデーション
  const disallowedCallbackPaths = ["/signin", "/signup", "/api/auth/"];
  const redirectUrl =
    callbackUrl &&
    !disallowedCallbackPaths.some((path) => callbackUrl.startsWith(path))
      ? callbackUrl
      : "/onboarding?first=true";

  return (
    <AuthCard title="アカウント作成" description="Googleアカウントで新規登録">
      <GoogleSignInButton callbackUrl={redirectUrl} label="Googleで登録" />

      <div className="text-center text-sm text-slate-600">
        <span>すでにアカウントをお持ちの方は </span>
        <Link
          href="/signin"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          ログイン
        </Link>
      </div>
    </AuthCard>
  );
}
