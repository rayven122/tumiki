import { CreateMcpServerPageClient } from "./_components/CreateMcpServerPageClient";

type CreateMcpServerPageProps = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * MCPサーバー作成選択ページ
 */
export default async function CreateMcpServerPage({
  params,
}: CreateMcpServerPageProps) {
  const { orgSlug } = await params;

  return <CreateMcpServerPageClient orgSlug={orgSlug} />;
}
