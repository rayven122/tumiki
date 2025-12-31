import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSessionInfo } from "~/lib/auth/session-utils";
import {
  PageContainer,
  NeoBrutalismCard,
  LogoWithGlow,
  GradientTitle,
} from "@/components/ui/neo-brutalism";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const orgSlug = getSessionInfo(session).organizationSlug;

  // callbackUrlのバリデーション（サインインループを防ぐ）
  const disallowedCallbackPaths = ["/signin", "/signup", "/api/auth/"];
  const validatedCallbackUrl =
    callbackUrl &&
    !disallowedCallbackPaths.some((path) => callbackUrl.startsWith(path))
      ? callbackUrl
      : null;

  // リダイレクト先の優先順位:
  // 1. 招待リンク（最優先）
  // 2. デフォルト組織ページ
  // 3. その他の callbackUrl
  // 4. 初回ユーザー（org_slug なし）
  let redirectUrl: string;
  if (validatedCallbackUrl?.startsWith("/invite/")) {
    redirectUrl = validatedCallbackUrl; // 招待リンクは最優先
  } else if (orgSlug) {
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
    <PageContainer>
      <div className="w-full max-w-md">
        <NeoBrutalismCard className="p-8 sm:p-10">
          {/* ヘッダー */}
          <div className="mb-10 text-center">
            {/* アイコン */}
            <LogoWithGlow className="mb-8" />

            {/* タイトル */}
            <GradientTitle className="mb-3 text-3xl">
              おかえりなさい
            </GradientTitle>
            <p className="text-sm font-medium text-gray-600">
              MCPサーバー統合管理プラットフォーム
              <br />
              <span className="text-indigo-600">
                Googleアカウントでログインしてください
              </span>
            </p>
          </div>

          {/* Googleボタン */}
          <div className="space-y-4">
            <GoogleSignInButton
              callbackUrl={redirectUrl}
              label="Googleでログイン"
            />
          </div>

          {/* フッター */}
          <div className="mt-10 border-t-2 border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{" "}
              <Link
                href={`/signup${validatedCallbackUrl ? `?callbackUrl=${encodeURIComponent(validatedCallbackUrl)}` : ""}`}
                className="font-bold text-indigo-600 underline decoration-2 underline-offset-2 transition-all hover:text-indigo-700 hover:decoration-indigo-700"
              >
                新規登録
              </Link>
            </p>
          </div>
        </NeoBrutalismCard>
      </div>
    </PageContainer>
  );
}
