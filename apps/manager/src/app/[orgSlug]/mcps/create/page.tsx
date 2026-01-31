import { redirect } from "next/navigation";

type CreateMcpServerPageProps = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * MCPサーバー作成ページ（リダイレクト）
 * 旧URL: /[orgSlug]/mcps/create → 新URL: /[orgSlug]/mcps
 */
export default async function CreateMcpServerPage({
  params,
}: CreateMcpServerPageProps) {
  const { orgSlug } = await params;

  // /mcps ページへリダイレクト
  redirect(`/${orgSlug}/mcps`);
}
