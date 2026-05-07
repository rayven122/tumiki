import { notFound } from "next/navigation";
import { RoleEditorPanel } from "../../_components/RoleEditorPanel";
import { getRoleById } from "../../_components/idp-ui-mock-data";

const AdminRoleDetailPage = async ({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) => {
  const { roleId } = await params;
  const role = getRoleById(roleId);
  if (!role) notFound();

  return <RoleEditorPanel mode="edit" role={role} />;
};

export default AdminRoleDetailPage;
