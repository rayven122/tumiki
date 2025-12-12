import { BasicInfoSection } from "./BasicInfoSection";
import { MemberManagementSection } from "./MemberManagementSection";
import { InvitationManagementSection } from "./InvitationManagementSection";
import { UsageStatsSection } from "./UsageStatsSection";

export const OrganizationDashboard = () => {
  return (
    <div className="container mx-auto space-y-8 p-6">
      <h1 className="text-3xl font-bold">組織ダッシュボード</h1>

      <BasicInfoSection />

      <MemberManagementSection />

      <InvitationManagementSection />

      <UsageStatsSection />
    </div>
  );
};
