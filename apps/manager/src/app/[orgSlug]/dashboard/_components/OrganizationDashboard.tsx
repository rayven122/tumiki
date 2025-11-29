import { BasicInfoSection } from "./BasicInfoSection";
import { MemberManagementSection } from "./MemberManagementSection";
import { InvitationManagementSection } from "./InvitationManagementSection";
import { UsageStatsSection } from "./UsageStatsSection";
import { type OrganizationId } from "@/schema/ids";

type OrganizationDashboardProps = {
  organizationId: OrganizationId;
};

export const OrganizationDashboard = ({
  organizationId,
}: OrganizationDashboardProps) => {
  return (
    <div className="container mx-auto space-y-8 p-6">
      <h1 className="text-3xl font-bold">組織ダッシュボード</h1>

      <BasicInfoSection organizationId={organizationId} />

      <MemberManagementSection organizationId={organizationId} />

      <InvitationManagementSection organizationId={organizationId} />

      <UsageStatsSection organizationId={organizationId} />
    </div>
  );
};
