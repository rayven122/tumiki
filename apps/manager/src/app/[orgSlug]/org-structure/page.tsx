import { OrgStructureClient } from "./_components/OrgStructureClient";

type OrgStructurePageProps = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * 組織構造編集ページ
 *
 * Server Component
 * - paramsからorgSlugを取得
 * - OrgStructureClientへ渡す
 */
export default async function OrgStructurePage({
  params,
}: OrgStructurePageProps) {
  const { orgSlug } = await params;

  return <OrgStructureClient orgSlug={orgSlug} />;
}
