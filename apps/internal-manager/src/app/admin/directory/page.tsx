import {
  DirectoryManagementPanel,
  type DirectoryTab,
} from "../_components/DirectoryManagementPanel";

const isDirectoryTab = (
  value: string | string[] | undefined,
): value is DirectoryTab => value === "organizations" || value === "groups";

const AdminDirectoryPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const params = await searchParams;
  const initialTab = isDirectoryTab(params.tab) ? params.tab : "organizations";

  return <DirectoryManagementPanel initialTab={initialTab} />;
};

export default AdminDirectoryPage;
