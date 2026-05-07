import { UserDetailPanel } from "../../_components/UserDetailPanel";

const UserDetailPage = async ({
  params,
}: {
  params: Promise<{ userId: string }>;
}) => {
  const { userId } = await params;
  return <UserDetailPanel userId={userId} />;
};

export default UserDetailPage;
