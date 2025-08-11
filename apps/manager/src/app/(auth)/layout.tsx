import { Header } from "@/app/_components/Header";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@tumiki/auth/server";
import { api } from "@/trpc/server";
import { ONBOARDING_CHECK_HEADER_KEY } from "@/constants/url";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ヘッダーからオンボーディングチェックフラグを取得
  const headersList = await headers();
  const requiresCheck = headersList.get(ONBOARDING_CHECK_HEADER_KEY);

  // フラグが設定されている場合はオンボーディングチェックを実行
  if (requiresCheck === "true") {
    const session = await auth();
    if (session?.user?.sub) {
      try {
        const { isOnboardingCompleted } =
          await api.user.checkOnboardingStatus();
        if (!isOnboardingCompleted) {
          return redirect("/onboarding");
        }
      } catch {
        // エラーの場合はオンボーディングへリダイレクト
        return redirect("/onboarding");
      }
    }
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
