import { cookies } from "next/headers";
import Script from "next/script";

import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateCUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { auth } from "~/auth";

export default async function Page() {
  const session = await auth();

  // 親レイアウトで認証チェック済みだが、session が必要なので取得
  if (!session?.user) {
    return null;
  }

  const id = generateCUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  const chatModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={chatModel}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
