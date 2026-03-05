/**
 * 受付モード - 新規チャットページ
 * AIカメラ＋音声認識＋VRMアバターによる受付・サポートセンターUI
 */

import { auth } from "~/auth";
import { api } from "@/trpc/server";
import { generateCUID } from "@/lib/utils";
import { DEFAULT_CHAT_MODEL } from "@/features/chat/services/ai";
import { ReceptionMode } from "@/features/avatar/components/ReceptionMode";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

const ReceptionPage = async (props: PageProps) => {
  const params = await props.params;
  const { orgSlug } = params;
  const decodedSlug = decodeURIComponent(orgSlug);

  const session = await auth();

  // 認証チェック
  if (!session?.user) {
    return null;
  }

  // 組織IDを取得
  const organization = await api.organization.getBySlug({ slug: decodedSlug });

  const id = generateCUID();

  // 新規チャットではデフォルト値を渡す
  const chatModel = DEFAULT_CHAT_MODEL;
  const mcpServerIds: string[] = [];

  return (
    <ReceptionMode
      key={id}
      id={id}
      organizationId={organization.id}
      orgSlug={decodedSlug}
      initialMessages={[]}
      initialChatModel={chatModel}
      initialMcpServerIds={mcpServerIds}
      isNewChat={true}
      currentUserId={session.user.id}
    />
  );
};

export default ReceptionPage;
