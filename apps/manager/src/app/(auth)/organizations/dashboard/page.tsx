import { api } from "@/trpc/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSessionInfo } from "~/lib/auth/session-utils";

const OrganizationDashboardPage = async () => {
  // 現在のセッションを取得
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // サーバー側で現在の組織を取得
  const organizations = await api.organization.getUserOrganizations();

  // セッションから組織slugを取得（セッション管理方式）
  const currentOrgSlug = getSessionInfo(session).organizationSlug;

  const currentOrg = currentOrgSlug
    ? organizations.find((org) => org.slug === currentOrgSlug)
    : null;

  // 現在の組織がない場合は最初の組織を使用
  const targetOrg = currentOrg ?? organizations[0];

  // 組織がない場合はMCPサーバーページへリダイレクト
  if (!targetOrg) {
    redirect("/mcp/servers");
  }

  // 組織のダッシュボードへリダイレクト
  redirect(`/${targetOrg.slug}/dashboard`);
};

export default OrganizationDashboardPage;
