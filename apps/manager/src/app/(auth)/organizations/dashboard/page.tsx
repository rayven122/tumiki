import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@tumiki/db/server";

const OrganizationDashboardPage = async () => {
  // 現在のセッションを取得
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // サーバー側で現在の組織を取得
  const organizations = await api.organization.getUserOrganizations();

  // ユーザー情報を取得してデフォルト組織を確認
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { defaultOrganizationSlug: true },
  });

  const defaultOrg = organizations.find(
    (org) => org.slug === user?.defaultOrganizationSlug,
  );

  // デフォルト組織がない場合は最初の組織を使用
  const targetOrg = defaultOrg ?? organizations[0];

  // 組織がない場合はMCPサーバーページへリダイレクト
  if (!targetOrg) {
    redirect("/mcp/servers");
  }

  // 組織のダッシュボードへリダイレクト
  redirect(`/${targetOrg.slug}/dashboard`);
};

export default OrganizationDashboardPage;
