import { api } from "@/trpc/server";
import { OrganizationDashboard } from "./_components/OrganizationDashboard";
import { redirect } from "next/navigation";

const OrganizationDashboardPage = async () => {
  // サーバー側で現在の組織を取得
  const organizations = await api.organization.getUserOrganizations();

  // デフォルト組織を探す
  const defaultOrg = organizations.find((org) => org.isDefault);

  // デフォルト組織がない場合はMCPサーバーページへリダイレクト
  if (!defaultOrg) {
    redirect("/mcp/servers");
  }

  // 個人組織の場合は組織専用のMCPページへリダイレクト
  if (defaultOrg.isPersonal) {
    redirect(`/${defaultOrg.slug}/mcps`);
  }

  return <OrganizationDashboard organizationId={defaultOrg.id} />;
};

export default OrganizationDashboardPage;
