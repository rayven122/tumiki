import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import Image from "next/image";
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
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="relative w-full border-2 border-black bg-white p-8 shadow-[var(--shadow-hard)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_#000000] sm:p-10">
          {/* ヘッダー */}
          <div className="mb-10 text-center">
            {/* アイコン */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-2 animate-pulse bg-linear-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl"></div>
                <Image
                  src="/favicon/logo.svg"
                  alt="Tumiki"
                  width={80}
                  height={80}
                  className="relative h-20 w-20"
                />
              </div>
            </div>

            {/* タイトル */}
            <h1 className="mb-3 bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              おかえりなさい
            </h1>
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
                href="/signup"
                className="font-bold text-indigo-600 underline decoration-2 underline-offset-2 transition-all hover:text-indigo-700 hover:decoration-indigo-700"
              >
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
