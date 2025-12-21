import { OrgStructureClient } from "@/app/[orgSlug]/org-structure/_components/OrgStructureClient";

/**
 * モック版組織構造編集ページ
 *
 * 認証不要でアクセス可能
 * 開発・検証用
 */
export default function MockOrgStructurePage() {
  return <OrgStructureClient orgSlug="mock-org" />;
}
