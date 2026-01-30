import { redirect } from "next/navigation";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

/**
 * サインインページ
 * API Route にリダイレクト
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;

  // API Route にリダイレクト（クエリパラメータを引き継ぐ）
  const apiUrl = callbackUrl
    ? `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/api/auth/signin";

  redirect(apiUrl);
}
