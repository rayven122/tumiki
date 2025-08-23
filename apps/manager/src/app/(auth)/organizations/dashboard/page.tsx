import { api } from "@/trpc/server";
import { OrganizationDashboard } from "./_components/OrganizationDashboard";
import { redirect } from "next/navigation";

const OrganizationDashboardPage = async () => {
  // サーバー側で現在の組織を取得
  const organizations = await api.organization.getUserOrganizations();

  // デフォルト組織を探す
  const defaultOrg = organizations.find((org) => org.isDefault);

  // 個人組織またはデフォルト組織がない場合はMCPサーバーページへリダイレクト
  if (!defaultOrg || defaultOrg.isPersonal) {
    redirect("/mcp/servers");
  }

  return <OrganizationDashboard organizationId={defaultOrg.id} />;
};

export default OrganizationDashboardPage;
