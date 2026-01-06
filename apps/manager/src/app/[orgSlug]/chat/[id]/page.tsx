import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";

import { auth } from "~/auth";
import { Chat } from "@/components/chat";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Message } from "@tumiki/db/prisma";
import type { Attachment, UIMessage } from "ai";

type PageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  // 親レイアウトで認証チェック済みだが、session が必要なので取得
  if (!session?.user) {
    return null;
  }

  // プライベートチャットのアクセス制御
  if (chat.visibility === "private") {
    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const convertToUIMessages = (messages: Array<Message>): Array<UIMessage> => {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage["parts"],
      role: message.role as UIMessage["role"],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: "",
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as unknown as Array<Attachment>) ?? [],
    }));
  };

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  const chatModel = chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialChatModel={chatModel}
        initialVisibilityType={chat.visibility}
        isReadonly={session.user.id !== chat.userId}
        session={session}
        autoResume={true}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
