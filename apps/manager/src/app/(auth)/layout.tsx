import { Header } from "@/app/_components/Header";
import { redirect } from "next/navigation";
import { auth } from "@tumiki/auth/server";
import { api } from "@/trpc/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証チェック
  const session = await auth();
  if (session?.user?.sub) {
    try {
      // ユーザーの組織を取得
      const organizations = await api.organization.getUserOrganizations();

      // 組織が1つも存在しない場合はオンボーディングへリダイレクト
      if (organizations.length === 0) {
        return redirect("/onboarding");
      }
    } catch {
      // エラーの場合はオンボーディングへリダイレクト
      return redirect("/onboarding");
    }
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
