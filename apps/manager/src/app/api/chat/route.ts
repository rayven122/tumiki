import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  stepCountIs,
  JsonToSseTransformStream,
  type Tool,
  type UIMessageStreamWriter,
} from "ai";
import { auth } from "~/auth";
import {
  type RequestHints,
  systemPrompt,
  getLanguageModel,
  entitlementsByUserType,
} from "@/features/chat/services/ai";
import { createDocument } from "@/features/chat/services/ai/tools/create-document";
import { updateDocument } from "@/features/chat/services/ai/tools/update-document";
import { requestSuggestions } from "@/features/chat/services/ai/tools/request-suggestions";
import { getWeather } from "@/features/chat/services/ai/tools/get-weather";
import { getMcpToolsFromServers } from "@/features/chat/services/ai/tools/mcp";
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
import { convertOutputsToRefs } from "@/lib/db/tool-output-utils";
import { generateCUID } from "@/lib/utils";
import { isProductionEnvironment } from "@/lib/constants";
import { postRequestBodySchema, type PostRequestBody } from "./schema";
import { geolocation } from "@vercel/functions";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import type { Chat } from "@tumiki/db/prisma";
import { differenceInSeconds } from "date-fns";
import { ChatSDKError } from "@/lib/errors";
import { generateTitleFromUserMessage } from "@/app/[orgSlug]/chat/actions";
import { checkChatAccess } from "@/lib/auth/chat-permissions";

export const maxDuration = 60;

/**
 * Resumable Stream Contextを取得
 * vercel/ai-chatbot と同じパターンでシンプルに実装
 * REDIS_URL が設定されていない場合は null を返す
 */
const getStreamContext = () => {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch {
    return null;
  }
};

/**
 * AI SDK 6 の UIMessage ツール状態
 * @see https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot#tool-invocations
 */
type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

/**
 * 古い形式のツール状態
 * 後方互換性のために定義
 */
type LegacyToolState = "call" | "partial-call" | "result" | "error";

/**
 * DBに保存されているツール状態を AI SDK 6 形式に変換
 * 新旧両方の形式をサポート
 */
const convertToolState = (state: string): ToolState => {
  switch (state) {
    case "input-streaming":
    case "input-available":
    case "output-available":
    case "output-error":
      return state;
    case "call":
      return "input-available";
    case "partial-call":
      return "input-streaming";
    case "result":
      return "output-available";
    case "error":
      return "output-error";
    default:
      return "input-available";
  }
};

/**
 * DBに保存されているツールパーツの型
 * 古い形式と新しい形式の両方をサポート
 */
type DBToolPart = {
  type: string;
  toolCallId: string;
  state: ToolState | LegacyToolState;
  input?: unknown;
  output?: unknown;
};

/**
 * DBから取得したメッセージを AI SDK 6 UIMessage 形式に変換
 *
 * UIMessage形式では、roleは 'system' | 'user' | 'assistant' のみ。
 * ツール呼び出しとその結果は、アシスタントメッセージの parts 内に
 * 適切な state で含まれる必要がある:
 * - input-streaming: ストリーミング中
 * - input-available: 入力完了
 * - output-available: 結果あり
 * - output-error: エラー
 *
 * 重要: Anthropic API は tool_use ブロックの後にテキストコンテンツを許可しない。
 * tool_use の後にはすぐに tool_result が必要で、continuation text は
 * 新しいアシスタントメッセージとして分離する必要がある。
 *
 * convertToModelMessages が UIMessage を Anthropic API 形式に変換する際、
 * 内部で tool_use と tool_result の適切な分離を行う
 */
const convertDBMessagesToAISDK6Format = (
  messages: Array<{
    id: string;
    role: string;
    parts: unknown[];
  }>,
): Array<{
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; [key: string]: unknown }>;
}> => {
  const result: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    parts: Array<{ type: string; [key: string]: unknown }>;
  }> = [];

  for (const msg of messages) {
    const role = msg.role as "user" | "assistant" | "system";

    // アシスタントメッセージの場合、ツールパーツの状態を変換し、
    // 必要に応じてメッセージを分割する
    if (role === "assistant") {
      const convertedParts: Array<{ type: string; [key: string]: unknown }> =
        [];

      // 最後の完了済みツールパーツのインデックスを追跡
      let lastCompletedToolIndex = -1;

      // まずすべてのパーツを変換
      for (const part of msg.parts) {
        const typedPart = part as { type: string; [key: string]: unknown };

        // ツール呼び出しパーツの場合、状態を AI SDK 6 形式に変換
        if (typedPart.type.startsWith("tool-")) {
          const toolPart = typedPart as DBToolPart;

          // DB状態を AI SDK 6 状態に変換
          const aiSdk6State = convertToolState(toolPart.state);

          convertedParts.push({
            type: toolPart.type,
            toolCallId: toolPart.toolCallId,
            state: aiSdk6State,
            input: toolPart.input,
            // output-available または output-error の場合のみ output を含む
            ...(aiSdk6State === "output-available" ||
            aiSdk6State === "output-error"
              ? { output: toolPart.output }
              : {}),
          });

          // 完了済みツールパーツの場合、インデックスを更新
          if (
            aiSdk6State === "output-available" ||
            aiSdk6State === "output-error"
          ) {
            lastCompletedToolIndex = convertedParts.length - 1;
          }
        } else {
          // テキストパーツなどはそのまま
          convertedParts.push(typedPart);
        }
      }

      // ツール呼び出しの後にテキストがある場合はメッセージを分割
      // Anthropic API: tool_use ブロックの後にテキストコンテンツは許可されない
      if (
        lastCompletedToolIndex >= 0 &&
        lastCompletedToolIndex < convertedParts.length - 1
      ) {
        // ツールパーツの後にコンテンツがある場合
        const hasTextAfterTool = convertedParts
          .slice(lastCompletedToolIndex + 1)
          .some((p) => p.type === "text" && (p.text as string)?.trim());

        if (hasTextAfterTool) {
          // 最初のメッセージ: ツールパーツまで（ツールパーツを含む）
          const firstParts = convertedParts.slice(
            0,
            lastCompletedToolIndex + 1,
          );
          // 2番目のメッセージ: ツールパーツの後のコンテンツ
          const secondParts = convertedParts.slice(lastCompletedToolIndex + 1);

          // 空でないパーツがある場合のみ追加
          if (firstParts.length > 0) {
            result.push({
              id: msg.id,
              role: "assistant",
              parts: firstParts,
            });
          }

          // 2番目のメッセージ用に新しいIDを生成
          // continuation text を別のアシスタントメッセージとして追加
          if (secondParts.length > 0) {
            result.push({
              id: `${msg.id}_cont`,
              role: "assistant",
              parts: secondParts,
            });
          }

          continue; // この msg の処理は完了
        }
      }

      // 分割不要の場合はそのまま追加
      result.push({
        id: msg.id,
        role: "assistant",
        parts: convertedParts,
      });
    } else {
      // ユーザーメッセージやシステムメッセージはそのまま追加
      result.push({
        id: msg.id,
        role,
        parts: msg.parts as Array<{ type: string; [key: string]: unknown }>,
      });
    }
  }

  return result;
};

export const POST = async (request: Request) => {
  let requestBody: PostRequestBody;

  try {
    const json: unknown = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
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
      personaId,
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
      // 権限チェック（共通関数を使用）
      const accessResult = checkChatAccess({
        chatUserId: chat.userId,
        chatVisibility: chat.visibility,
        chatOrganizationId: chat.organizationId,
        currentUserId: session.user.id,
        currentOrganizationId: organizationId,
      });

      if (!accessResult.canAccess) {
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

    // 前のメッセージとユーザーメッセージを結合
    // DBに保存されているツール呼び出しを AI SDK 6 / Anthropic API 形式に変換
    // ツール結果を別のメッセージとして分離することで、
    // tool_use → tool_result の順序を正しく構築する
    const dbMessages = previousMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts as unknown[],
    }));

    // DBメッセージを変換（ツール呼び出しとツール結果を分離）
    const convertedMessages = convertDBMessagesToAISDK6Format(dbMessages);

    // 新しいユーザーメッセージを追加
    const allMessages = [
      ...convertedMessages,
      {
        id: message.id,
        role: "user" as const,
        parts: message.parts as Array<{ type: string; [key: string]: unknown }>,
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

    // MCPサーバーからツールを取得
    // 遅延接続方式: DBからツール定義を取得し、ツール実行時のみmcp-proxyに接続
    let mcpTools: Record<string, Tool> = {};
    let mcpToolNames: string[] = [];

    if (selectedMcpServerIds.length > 0 && session.accessToken) {
      const mcpResult = await getMcpToolsFromServers(
        selectedMcpServerIds,
        session.accessToken,
      );
      mcpTools = mcpResult.tools;
      mcpToolNames = mcpResult.toolNames;

      await updateChatMcpServers(id, selectedMcpServerIds);

      // 開発環境でのみデバッグ情報をログ出力
      if (!isProductionEnvironment) {
        console.log("[MCP Debug]", {
          toolCount: mcpToolNames.length,
          toolNames: mcpToolNames,
          successfulServers: mcpResult.successfulServers,
          errors: mcpResult.errors,
        });
      }
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
    // vercel/ai-chatbot と同じパターン: 通常のフローでは originalMessages は undefined
    // ツール承認フローの場合のみ originalMessages を設定する
    // tumiki ではツール承認フローがないため、常に undefined
    const stream = createUIMessageStream({
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
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            mcpToolNames,
            personaId,
          }).prompt,
          messages: modelMessages,
          stopWhen: stepCountIs(5),
          experimental_activeTools: isReasoningModel ? [] : allActiveToolNames,
          providerOptions: isReasoningModel
            ? {
                anthropic: {
                  thinking: { type: "enabled", budgetTokens: 10_000 },
                },
              }
            : undefined,
          tools: allTools,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        // streamTextの結果をUIMessageStreamにマージ
        const uiMessageStream = result.toUIMessageStream({
          sendReasoning: true,
        });

        writer.merge(uiMessageStream);
      },
      // vercel/ai-chatbot と同じパターン: createUIMessageStream の onFinish を使用
      // finishedMessages は既に UIMessage 形式になっている
      onFinish: async ({ messages: finishedMessages }) => {
        if (session.user?.id) {
          try {
            // 元のメッセージIDをセットに保存してフィルタリングを高速化
            const originalMessageIds = new Set(allMessages.map((m) => m.id));

            // 新しいアシスタントメッセージのみを保存
            // finishedMessages には元のメッセージも含まれるため、
            // 新しく追加されたアシスタントメッセージのみをフィルタリング
            const newAssistantMessages = finishedMessages.filter(
              (msg) =>
                msg.role === "assistant" && !originalMessageIds.has(msg.id),
            );

            if (newAssistantMessages.length > 0) {
              await saveMessages({
                messages: newAssistantMessages.map((msg) => ({
                  id: msg.id,
                  chatId: id,
                  role: "assistant" as const,
                  // ツールoutputをBigQuery参照に変換（outputは保存せずoutputRefのみ）
                  parts: convertOutputsToRefs(
                    msg.parts as unknown[],
                  ) as unknown as Array<{
                    text: string;
                    type: string;
                  }>,
                  attachments: [],
                  createdAt: new Date(),
                })),
              });
            }
          } catch (error) {
            console.error("Failed to save chat:", error);
          }
        }
      },
      onError: (error) => {
        console.error("UIMessageStream error:", error);
        return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      },
    });

    // vercel/ai-chatbot と同じパターンで resumable stream を処理
    // createUIMessageStreamResponse の consumeSseStream コールバックを使用
    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        // Redis が設定されていない場合はスキップ（vercel/ai-chatbot と同じ）
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateCUID();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream,
            );
          }
        } catch {
          // Redis エラーは無視（vercel/ai-chatbot と同じ）
        }
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    // エラーログを出力してデバッグ
    console.error("Chat API error:", error);
    // クライアント側のChatSDKErrorが期待するcode形式でレスポンスを返す
    return new Response(
      JSON.stringify({
        code: "bad_request:api",
        message: "An error occurred while processing your message.",
        cause: error instanceof Error ? error.message : "Unknown error",
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

  // 権限チェック（共通関数を使用）
  // 注: GET ハンドラーでは organizationId がリクエストに含まれないため、
  // チャット自体の organizationId を使用してアクセス権限をチェック
  const accessResult = checkChatAccess({
    chatUserId: chat.userId,
    chatVisibility: chat.visibility,
    chatOrganizationId: chat.organizationId,
    currentUserId: session.user.id,
    currentOrganizationId: chat.organizationId, // 同一組織内でのアクセスを仮定
  });

  if (!accessResult.canAccess) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

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
