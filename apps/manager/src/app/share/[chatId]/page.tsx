import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { getPublicChatById, getMessagesByChatId } from "@/lib/db/queries";
import { SharedChatMessages } from "./_components/SharedChatMessages";
import { Button } from "@/components/ui/button";
import type { Message } from "@tumiki/db/prisma";
import type { UIMessage } from "ai";
import type { Attachment } from "@/lib/types";

type PageProps = {
  params: Promise<{ chatId: string }>;
};

// OGPメタデータを動的に生成
export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { chatId } = await params;
  const chat = await getPublicChatById({ id: chatId });

  if (!chat) {
    return {
      title: "チャットが見つかりません | tumiki",
    };
  }

  const title = chat.title || "共有チャット";
  const description = `${chat.user?.name ?? "ユーザー"}さんが共有したチャット`;

  return {
    title: `${title} | tumiki`,
    description,
    openGraph: {
      title: `${title} | tumiki`,
      description,
      type: "article",
      siteName: "tumiki",
    },
    twitter: {
      card: "summary",
      title: `${title} | tumiki`,
      description,
    },
  };
};

export default async function SharedChatPage({ params }: PageProps) {
  const { chatId } = await params;

  // 公開チャットのみ取得可能
  const chat = await getPublicChatById({ id: chatId });

  if (!chat) {
    notFound();
  }

  const messagesFromDb = await getMessagesByChatId({ id: chatId });

  const convertToUIMessages = (messages: Array<Message>): Array<UIMessage> => {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage["parts"],
      role: message.role as UIMessage["role"],
      content: "",
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as unknown as Array<Attachment>) ?? [],
    }));
  };

  const messages = convertToUIMessages(messagesFromDb);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold">tumiki</span>
          </Link>
          <Button asChild size="sm">
            <Link href="/signin">tumikiで会話を続ける</Link>
          </Button>
        </div>
      </header>

      {/* チャットコンテンツ */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* チャット情報 */}
          <div className="mb-6 border-b pb-4">
            <h1 className="text-xl font-semibold">
              {chat.title || "共有チャット"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {chat.user?.name ?? "ユーザー"}さんが共有
              {chat.createdAt && (
                <span className="ml-2">
                  ・{" "}
                  {new Date(chat.createdAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </p>
          </div>

          {/* メッセージ一覧 */}
          <SharedChatMessages messages={messages} />
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t py-4">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-muted-foreground text-sm">
            <Link href="/" className="hover:underline">
              tumiki
            </Link>{" "}
            で作成されたチャット
          </p>
        </div>
      </footer>
    </div>
  );
}
