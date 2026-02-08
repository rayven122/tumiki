import { EEFeatureGate, EEUpgradePrompt } from "@/components/ee";
import { RoleManagement } from "./_components/RoleManagement";

const RoleManagementPage = () => {
  return (
    <EEFeatureGate
      feature="role-management"
      fallback={<EEUpgradePrompt feature="role-management" />}
    >
      <RoleManagement />
    </EEFeatureGate>
  );
};

export default RoleManagementPage;
