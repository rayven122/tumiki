import { redirect } from "next/navigation";

type AddServerPageProps = {
  params: Promise<{
    orgSlug: string;
  }>;
};

/**
 * MCPサーバー追加ページ（リダイレクト）
 * 旧URL: /[orgSlug]/mcps/add → 新URL: /[orgSlug]/mcps
 */
export default async function AddServerPage({ params }: AddServerPageProps) {
  const { orgSlug } = await params;

  // /mcps ページへリダイレクト
  redirect(`/${orgSlug}/mcps`);
}
