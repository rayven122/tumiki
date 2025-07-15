"use client";

import { useSearchParams } from "next/navigation";
import { OrganizationDashboard } from "./_components/OrganizationDashboard";

const OrganizationDashboardPage = () => {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");

  if (!orgId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">エラー</h1>
          <p className="mt-2 text-gray-600">組織が選択されていません。</p>
        </div>
      </div>
    );
  }

  return <OrganizationDashboard organizationId={orgId} />;
};

export default OrganizationDashboardPage;
