import { api } from "@/trpc/server";
import { OrganizationDashboard } from "./_components/OrganizationDashboard";
import { OrganizationIdSchema } from "@/schema/ids";

type OrganizationDashboardPageProps = {
  params: Promise<{ orgSlug: string }>;
};

const OrganizationDashboardPage = async ({
  params,
}: OrganizationDashboardPageProps) => {
  const { orgSlug } = await params;
  // URLデコードを明示的に行う（@などの特殊文字対応）
  const decodedSlug = decodeURIComponent(orgSlug);

  // スラッグから組織情報を取得（layout.tsxで既に検証済み）
  const organization = await api.organization.getBySlug({ slug: decodedSlug });

  // 組織IDをbranded typeに変換
  const organizationId = OrganizationIdSchema.parse(organization.id);

  return <OrganizationDashboard organizationId={organizationId} />;
};

export default OrganizationDashboardPage;
