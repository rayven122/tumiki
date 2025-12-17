import { CreateIntegratedPageClient } from "./_components/CreateIntegratedPageClient";

type CreateIntegratedPageProps = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * 統合MCPサーバー作成ページ
 */
const CreateIntegratedPage = async ({ params }: CreateIntegratedPageProps) => {
  const { orgSlug } = await params;
  return <CreateIntegratedPageClient orgSlug={orgSlug} />;
};

export default CreateIntegratedPage;
