import { redirect } from "next/navigation";

type RoleManagementPageProps = {
  params: Promise<{ orgSlug: string }>;
};

const RoleManagementPage = async ({ params }: RoleManagementPageProps) => {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/members?tab=roles`);
};

export default RoleManagementPage;
