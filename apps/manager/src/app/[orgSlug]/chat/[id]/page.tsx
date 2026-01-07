import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";

import { auth } from "~/auth";
import { Chat } from "@/components/chat";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Message } from "@tumiki/db/prisma";
import type { ChatMessage } from "@/lib/types";
import { getMcpServerIdsFromCookie } from "../actions";
import { api } from "@/trpc/server";

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

  // アクセス権限チェック
  const isOwner = chat.userId === session.user.id;
  const isOrganizationShared =
    chat.visibility === "ORGANIZATION" &&
    chat.organizationId === organization.id;

  // PRIVATEチャットは所有者のみアクセス可能
  if (chat.visibility === "PRIVATE" && !isOwner) {
    return notFound();
  }

  // ORGANIZATIONチャットは同じ組織のメンバーのみアクセス可能
  if (chat.visibility === "ORGANIZATION" && !isOwner && !isOrganizationShared) {
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

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  const chatModel = chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  // DBからMCPサーバーIDを取得、なければCookieからフォールバック
  const mcpServerIdsFromDb = chat.mcpServers.map((server) => server.id);
  const mcpServerIds =
    mcpServerIdsFromDb.length > 0
      ? mcpServerIdsFromDb
      : await getMcpServerIdsFromCookie();

  // 編集可能かどうか: 所有者または組織内共有チャット
  const canEdit = isOwner || isOrganizationShared;

  return (
    <>
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
        isReadonly={!canEdit}
        session={session}
        autoResume={true}
        isPersonalOrg={organization.isPersonal}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
