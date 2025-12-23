import { auth } from "@/auth";
import { getSessionInfo } from "@/lib/auth/session-utils";
import { redirect } from "next/navigation";
import { OrgStructureClient } from "./_components/OrgStructureClient";

type OrgStructurePageProps = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * 組織構造編集ページ
 *
 * Server Component
 * - セッションから組織IDを取得
 * - OrgStructureClientに組織IDを渡す
 */
export default async function OrgStructurePage({
  params,
}: OrgStructurePageProps) {
  await params;

  // セッションから組織情報を取得
  const session = await auth();
  const { organizationId } = getSessionInfo(session);

  // 組織IDが取得できない場合はオンボーディングへリダイレクト
  if (!organizationId) {
    redirect("/onboarding");
  }

  return <OrgStructureClient organizationId={organizationId} />;
}
