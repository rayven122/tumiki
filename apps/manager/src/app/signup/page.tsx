import { redirect } from "next/navigation";

type SignUpPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

/**
 * 新規登録ページ
 * API Route にリダイレクト
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { callbackUrl } = await searchParams;

  // API Route にリダイレクト（クエリパラメータを引き継ぐ）
  const apiUrl = callbackUrl
    ? `/api/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/api/auth/signup";

  redirect(apiUrl);
}
