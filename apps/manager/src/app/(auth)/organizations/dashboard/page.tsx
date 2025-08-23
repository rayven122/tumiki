"use client";

import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { OrganizationDashboard } from "./_components/OrganizationDashboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const OrganizationDashboardPage = () => {
  const { currentOrganization, isLoading } = useOrganizationContext();
  const router = useRouter();

  useEffect(() => {
    // 個人組織の場合はMCPサーバーページへリダイレクト
    if (
      !isLoading &&
      (!currentOrganization || currentOrganization.isPersonal)
    ) {
      router.push("/mcp/servers");
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading || !currentOrganization || currentOrganization.isPersonal) {
    return <div>Loading...</div>;
  }

  return <OrganizationDashboard organizationId={currentOrganization.id} />;
};

export default OrganizationDashboardPage;
