import { api } from "@/trpc/server";
import { OrganizationDashboard } from "./_components/OrganizationDashboard";
import { redirect } from "next/navigation";

const OrganizationDashboardPage = async () => {
  // サーバー側で現在の組織を取得
  const organizations = await api.organization.getUserOrganizations();
  
  // デフォルト組織を探す（isDefault: trueの組織）
  const defaultOrg = organizations.find(org => org.isDefault);
  
  if (!defaultOrg || defaultOrg.isPersonal) {
    // デフォルト組織がない、または個人組織の場合はMCPサーバーページへリダイレクト
    redirect("/mcp/servers");
  }

  return <OrganizationDashboard organizationId={defaultOrg.id} />;
};

export default OrganizationDashboardPage;