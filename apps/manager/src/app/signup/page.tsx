import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import {
  PageContainer,
  NeoBrutalismCard,
  LogoWithGlow,
  GradientTitle,
} from "@/components/ui/neo-brutalism";

export default function SignUpPage() {
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
              Tumiki へようこそ
            </GradientTitle>
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
        </NeoBrutalismCard>
      </div>
    </PageContainer>
  );
}
