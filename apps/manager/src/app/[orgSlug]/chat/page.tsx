import { cookies } from "next/headers";
import Script from "next/script";

import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateCUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { auth } from "~/auth";
import { getMcpServerIdsFromCookie } from "./actions";
import { api } from "@/trpc/server";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { orgSlug } = params;
  const decodedSlug = decodeURIComponent(orgSlug);

  const session = await auth();

  // 親レイアウトで認証チェック済みだが、session が必要なので取得
  if (!session?.user) {
    return null;
  }

  // 組織IDを取得
  const organization = await api.organization.getBySlug({ slug: decodedSlug });

  const id = generateCUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  const chatModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  // CookieからMCPサーバー選択を取得
  const mcpServerIds = await getMcpServerIdsFromCookie();

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <Chat
        key={id}
        id={id}
        organizationId={organization.id}
        orgSlug={decodedSlug}
        initialMessages={[]}
        initialChatModel={chatModel}
        initialVisibilityType="PRIVATE"
        initialMcpServerIds={mcpServerIds}
        isReadonly={false}
        session={session}
        autoResume={false}
        isPersonalOrg={organization.isPersonal}
        isNewChat={true}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
