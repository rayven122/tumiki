import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import Image from "next/image";

export default function SignUpPage() {
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
              Tumiki へようこそ
            </h1>
            <p className="text-sm font-medium text-gray-600">
              MCPサーバー統合管理プラットフォーム
              <br />
              <span className="text-indigo-600">
                Googleアカウントで始めましょう
              </span>
            </p>
          </div>

          {/* Googleボタン */}
          <div className="space-y-4">
            <GoogleSignInButton
              callbackUrl="/onboarding?first=true"
              label="Googleで続行"
            />
          </div>

          {/* フッター */}
          <div className="mt-10 border-t-2 border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              すでにアカウントをお持ちの方は{" "}
              <Link
                href="/signin"
                className="font-bold text-indigo-600 underline decoration-2 underline-offset-2 transition-all hover:text-indigo-700 hover:decoration-indigo-700"
              >
                ログイン
              </Link>
            </p>
            <div className="mt-6 text-xs text-gray-500">
              続行することで、
              <Link
                href="/terms"
                className="underline decoration-gray-400 underline-offset-2 transition-colors hover:text-gray-700 hover:decoration-gray-700"
              >
                利用規約
              </Link>
              および
              <Link
                href="/privacy"
                className="underline decoration-gray-400 underline-offset-2 transition-colors hover:text-gray-700 hover:decoration-gray-700"
              >
                プライバシーポリシー
              </Link>
              に同意したものとみなされます。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
