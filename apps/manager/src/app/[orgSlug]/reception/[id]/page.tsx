/**
 * 受付モード - 既存チャットページ
 * 既存のチャット履歴を受付モードで表示
 */

import { notFound } from "next/navigation";
import { auth } from "~/auth";
import { api } from "@/trpc/server";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { DEFAULT_CHAT_MODEL } from "@/features/chat/services/ai";
import { ReceptionMode } from "@/features/avatar/components/ReceptionMode";
import { checkChatAccess } from "@/lib/auth/chat-permissions";
import type { Message } from "@tumiki/db/prisma";
import type { ChatMessage } from "@/lib/types";

type PageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
};

const ReceptionChatPage = async (props: PageProps) => {
  const params = await props.params;
  const { orgSlug, id } = params;
  const decodedSlug = decodeURIComponent(orgSlug);

  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  // 認証チェック
  if (!session?.user) {
    return null;
  }

  // 組織IDを取得
  const organization = await api.organization.getBySlug({ slug: decodedSlug });

  // アクセス権限チェック
  const accessResult = checkChatAccess({
    chatUserId: chat.userId,
    chatVisibility: chat.visibility,
    chatOrganizationId: chat.organizationId,
    currentUserId: session.user.id,
    currentOrganizationId: organization.id,
  });

  if (!accessResult.canAccess) {
    return notFound();
  }

  // メッセージ取得
  const messagesFromDb = await getMessagesByChatId({ id });

  // ChatMessage型に変換
  const convertToUIMessages = (
    messages: Array<Message>,
  ): Array<ChatMessage> => {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as ChatMessage["parts"],
      role: message.role as ChatMessage["role"],
      metadata: {
        createdAt: message.createdAt.toISOString(),
      },
    }));
  };

  const chatModel = DEFAULT_CHAT_MODEL;
  const mcpServerIds = chat.mcpServers.map((server) => server.id);

  return (
    <ReceptionMode
      id={chat.id}
      organizationId={organization.id}
      orgSlug={decodedSlug}
      initialMessages={convertToUIMessages(messagesFromDb)}
      initialChatModel={chatModel}
      initialMcpServerIds={mcpServerIds}
      isNewChat={false}
      currentUserId={session.user.id}
    />
  );
};

export default ReceptionChatPage;
