import { RolesManagementPanel } from "../../_components/RolesManagementPanel";

const AdminRoleDetailPage = async ({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) => {
  const { roleId } = await params;

  return <RolesManagementPanel initialOrgUnitId={roleId} />;
};

export default AdminRoleDetailPage;
