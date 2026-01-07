import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  smoothStream,
  streamText,
  stepCountIs,
  JsonToSseTransformStream,
  type Tool,
  type UIMessageStreamWriter,
} from "ai";
import { auth } from "~/auth";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  updateChatMcpServers,
} from "@/lib/db/queries";
import { generateCUID, generateMessageId } from "@/lib/utils";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { getMcpToolsFromServers } from "@/lib/ai/tools/mcp";
import { isProductionEnvironment } from "@/lib/constants";
import { getLanguageModel } from "@/lib/ai/providers";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { postRequestBodySchema, type PostRequestBody } from "./schema";
import { geolocation } from "@vercel/functions";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { after } from "next/server";
import type { Chat } from "@tumiki/db/prisma";
import { differenceInSeconds } from "date-fns";
import { ChatSDKError } from "@/lib/errors";
import { generateTitleFromUserMessage } from "@/app/[orgSlug]/chat/actions";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getStreamContext = () => {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL",
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
};

export const POST = async (request: Request) => {
  let requestBody: PostRequestBody;

  try {
    const json: unknown = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      organizationId,
      message,
      selectedChatModel,
      selectedVisibilityType,
      selectedMcpServerIds,
    } = requestBody;

    const session = await auth();

    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType.regular.maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        organizationId,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      // 権限チェック: 自分のチャット または 組織内共有チャット（同じ組織のメンバー）
      const isOwner = chat.userId === session.user.id;
      const isOrganizationShared =
        chat.visibility === "ORGANIZATION" &&
        chat.organizationId === organizationId;

      if (!isOwner && !isOrganizationShared) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    // ユーザーメッセージを保存
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // 前のメッセージとユーザーメッセージを結合してUIMessage形式に変換
    const allMessages = [
      ...previousMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        parts: msg.parts as Array<{ type: "text"; text: string }>,
      })),
      {
        id: message.id,
        role: "user" as const,
        parts: message.parts,
      },
    ];

    // UIMessageからModelMessageに変換
    const modelMessages = await convertToModelMessages(
      allMessages as Parameters<typeof convertToModelMessages>[0],
    );

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    const streamId = generateCUID();
    await createStreamId({ streamId, chatId: id });

    // MCPサーバーからツールを取得
    let mcpTools: Record<string, Tool> = {};
    let mcpToolNames: string[] = [];

    if (selectedMcpServerIds.length > 0 && session.accessToken) {
      const mcpResult = await getMcpToolsFromServers(
        selectedMcpServerIds,
        session.accessToken,
      );
      mcpTools = mcpResult.tools as Record<string, Tool>;
      mcpToolNames = mcpResult.toolNames;

      // MCPサーバーをチャットに紐づけ
      await updateChatMcpServers(id, selectedMcpServerIds);
    }

    // 基本ツール名（型安全のため as const を使用）
    const baseToolNames = [
      "getWeather",
      "createDocument",
      "updateDocument",
      "requestSuggestions",
    ] as const;

    // 全ツール名をマージ（MCPツールは動的なため string[] にキャスト）
    const allActiveToolNames = [
      ...baseToolNames,
      ...mcpToolNames,
    ] as (typeof baseToolNames)[number][];

    // 推論モデルはツールを使用しない
    const isReasoningModel =
      selectedChatModel.includes("reasoning") ||
      selectedChatModel.endsWith("-thinking");

    // AI SDK 6: UIMessage形式のメッセージを作成
    const uiMessages = allMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts,
    }));

    const stream = createUIMessageStream({
      originalMessages: uiMessages,
      generateId: generateCUID,
      execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
        // 基本ツールとMCPツールをマージ
        const baseTools = {
          getWeather,
          createDocument: createDocument({ session, writer }),
          updateDocument: updateDocument({ session, writer }),
          requestSuggestions: requestSuggestions({
            session,
            writer,
          }),
        };

        const allTools = {
          ...baseTools,
          ...mcpTools,
        };

        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: modelMessages,
          stopWhen: stepCountIs(5),
          activeTools: isReasoningModel ? [] : allActiveToolNames,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: allTools,
          abortSignal: request.signal,
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                // AI SDK 6: response.messagesにはidが含まれないため、新しいIDを生成
                const assistantMessage = response.messages.find(
                  (msg) => msg.role === "assistant",
                );

                if (!assistantMessage) {
                  throw new Error("No assistant message found!");
                }

                // 新しいメッセージIDを生成
                const assistantId = generateMessageId();

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: "assistant",
                      parts: assistantMessage.content as unknown as Array<{
                        text: string;
                        type: string;
                      }>,
                      attachments: [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch {
                console.error("Failed to save chat");
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        // streamTextの結果をUIMessageStreamにマージ
        await writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      onError: (error) => {
        console.error("UIMessageStream error:", error);
        return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      // resumableStreamの場合はSSEヘッダーを手動で設定
      const resumableStream = await streamContext.resumableStream(
        streamId,
        () => stream.pipeThrough(new JsonToSseTransformStream()),
      );
      return new Response(resumableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // createUIMessageStreamResponseを使用して適切なヘッダーを設定
      return createUIMessageStreamResponse({ stream });
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    // エラーログを出力してデバッグ
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const GET = async (request: Request) => {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  let chat: Chat | null;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  // 権限チェック: PRIVATE は所有者のみ、ORGANIZATION は同組織のメンバーがアクセス可能
  if (chat.visibility === "PRIVATE" && chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }
  // 注: ORGANIZATION と PUBLIC は追加の権限チェックは不要（URLを知っていればアクセス可能）
  // 実際の組織メンバーシップ検証は必要に応じてミドルウェアで行う

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const emptyStream = createUIMessageStream({
    execute: () => {
      // No-op: Empty stream for SSR resume functionality
    },
  });

  const stream = await streamContext.resumableStream(recentStreamId, () =>
    emptyStream.pipeThrough(new JsonToSseTransformStream()),
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return createUIMessageStreamResponse({ stream: emptyStream });
    }

    if (mostRecentMessage.role !== "assistant") {
      return createUIMessageStreamResponse({ stream: emptyStream });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return createUIMessageStreamResponse({ stream: emptyStream });
    }

    const restoredStream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({
          type: "data-append-message" as const,
          data: mostRecentMessage,
        });
      },
    });

    return createUIMessageStreamResponse({ stream: restoredStream });
  }

  // resumableStreamの場合はSSEヘッダーを手動で設定
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const DELETE = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
};
