import { notFound } from "next/navigation";
import Script from "next/script";

import { auth } from "~/auth";
import { Chat } from "@/components/chat";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { DEFAULT_CHAT_MODEL } from "@/features/chat/services/ai";
import type { Message } from "@tumiki/db/prisma";
import type { ChatMessage } from "@/lib/types";
import { api } from "@/trpc/server";
import { checkChatAccess, canEditChat } from "@/lib/auth/chat-permissions";

type PageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { orgSlug, id } = params;
  const decodedSlug = decodeURIComponent(orgSlug);

  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  // 親レイアウトで認証チェック済みだが、session が必要なので取得
  if (!session?.user) {
    return null;
  }

  // 組織IDを取得
  const organization = await api.organization.getBySlug({ slug: decodedSlug });

  // アクセス権限チェック（共通関数を使用）
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

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  // AI SDK 6: ChatMessage型で返す（metadataはcreatedAtを含む）
  const convertToUIMessages = (
    messages: Array<Message>,
  ): Array<ChatMessage> => {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as ChatMessage["parts"],
      role: message.role as ChatMessage["role"],
      // AI SDK 6: metadataにcreatedAtを設定
      metadata: {
        createdAt: message.createdAt.toISOString(),
      },
    }));
  };

  // 既存チャットではDBの値を使用（Cookie/LocalStorageは参照しない）
  const chatModel = DEFAULT_CHAT_MODEL;

  // DBからMCPサーバーIDを取得
  const mcpServerIds = chat.mcpServers.map((server) => server.id);

  // エージェント情報を取得
  const agentInfo = chat.agent
    ? { name: chat.agent.name, iconPath: chat.agent.iconPath }
    : null;

  // 編集可能かどうか（共通関数を使用）
  // エージェントチャットの場合は閲覧のみ（追加のチャットは不可）
  const isAgentChat = chat.agentId !== null;
  const isEditable = canEditChat(accessResult) && !isAgentChat;

  return (
    <DataStreamProvider>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <Chat
        id={chat.id}
        organizationId={organization.id}
        orgSlug={decodedSlug}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialChatModel={chatModel}
        initialVisibilityType={chat.visibility}
        initialMcpServerIds={mcpServerIds}
        isReadonly={!isEditable}
        session={session}
        autoResume={true}
        isPersonalOrg={organization.isPersonal}
        agentInfo={agentInfo}
        initialPersonaId={chat.personaId ?? undefined}
      />
      <DataStreamHandler />
    </DataStreamProvider>
  );
}
