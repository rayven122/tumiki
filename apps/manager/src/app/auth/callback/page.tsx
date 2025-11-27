import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

export default async function AuthCallbackPage() {
  const session = await auth();

  // 未認証の場合はサインインページへ
  if (!session?.user) {
    redirect("/signin");
  }

  try {
    // デフォルト組織を取得
    const defaultOrg = await api.organization.getDefaultOrganization.query();

    // スラッグが存在する場合は組織のMCPページにリダイレクト
    if (defaultOrg?.slug) {
      redirect(`/${defaultOrg.slug}/mcps`);
    }
  } catch (error) {
    console.error("[AuthCallback] Error fetching default organization:", error);
  }

  // フォールバック: 組織ダッシュボードへリダイレクト
  redirect("/organizations/dashboard");
}
