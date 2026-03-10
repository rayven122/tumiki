import { api } from "@/trpc/server";
import { EEFeatureGate, EEUpgradePrompt } from "@/components/ee";
import { MembersPage } from "./_components/MembersPage";

type MembersPageProps = {
  params: Promise<{ orgSlug: string }>;
};

const Members = async ({ params }: MembersPageProps) => {
  const { orgSlug } = await params;
  // URLデコードを明示的に行う（@などの特殊文字対応）
  const decodedSlug = decodeURIComponent(orgSlug);

  // スラッグから組織情報を取得（layout.tsxで既に検証済み）
  const organization = await api.organization.getBySlug({ slug: decodedSlug });

  return (
    <EEFeatureGate
      feature="member-management"
      fallback={<EEUpgradePrompt feature="member-management" />}
    >
      <MembersPage organization={organization} />
    </EEFeatureGate>
  );
};

export default Members;
