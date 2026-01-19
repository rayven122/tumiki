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
import { getMcpToolsFromServers, closeMcpClients } from "@/lib/ai/tools/mcp";
import type { MCPClient } from "@ai-sdk/mcp";
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
import { checkChatAccess } from "@/lib/auth/chat-permissions";

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

/**
 * UIMessage parts用の型定義（DB保存用）
 * MCPツールを含む動的なツール名に対応
 */
type UIMessagePart =
  | { type: "text"; text: string }
  | {
      type: string; // "tool-{toolName}" 形式（MCPツールの場合は動的なツール名）
      toolCallId: string;
      state: "call" | "partial-call" | "result" | "error";
      input?: unknown;
      output?: unknown;
    };

/**
 * AI SDK 6 のレスポンスメッセージcontent要素の型
 * - ツール呼び出し: { type: "tool-call", toolCallId, toolName, input }
 * - ツール結果: { type: "tool-result", toolCallId, toolName, output, isError? }
 * - output は { type: "json", value: {...} } 形式でラップされている
 */
type ContentPart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  // AI SDK 6: args → input に変更
  input?: unknown;
  // AI SDK 6: result → output に変更、{ type: "json", value: {...} } 形式
  output?: { type: string; value: unknown };
  // ツールエラーフラグ（AI SDK 6）
  isError?: boolean;
};

/**
 * ツール結果の情報を保持する型
 */
type ToolResultInfo = {
  output: unknown;
  isError: boolean;
};

/**
 * AI SDK 6 のレスポンスメッセージ型
 */
type ResponseMessage = {
  role: string;
  content: string | ContentPart[];
};

/**
 * ResponseMessage配列からUIMessage用のpartsを構築
 * ツール呼び出しとその結果をマージして、正しい形式で保存する
 *
 * 注: onFinishが呼ばれる時点ではすべてのツール呼び出しは完了しているため、
 * ツール結果を収集してマッピングする
 */
const convertResponseMessagesToUIParts = (
  messages: unknown[],
): UIMessagePart[] => {
  const parts: UIMessagePart[] = [];

  // unknown[] を ResponseMessage[] として扱う
  const typedMessages = messages as ResponseMessage[];

  // ツール呼び出しIDと結果のマッピング（エラー情報含む）
  const toolResultMap = new Map<string, ToolResultInfo>();

  /**
   * outputから値を抽出し、エラー状態を判定する
   * AI SDK 6: output は以下の形式がある:
   * - { type: "json", value: {...} }
   * - { type: "error", value: ... }
   * - { content: [...], isError: true } (MCPエラーの場合)
   */
  const extractToolResult = (
    rawOutput: unknown,
    isErrorFlag?: boolean,
  ): ToolResultInfo => {
    let extractedOutput = rawOutput;
    let isError = isErrorFlag ?? false;

    if (rawOutput && typeof rawOutput === "object") {
      const outputObj = rawOutput as {
        type?: string;
        value?: unknown;
        isError?: boolean;
      };

      // エラータイプの出力をチェック
      if (outputObj.type === "error") {
        isError = true;
      }

      // 値を抽出
      if ("value" in outputObj) {
        extractedOutput = outputObj.value;

        // 抽出した値にも isError がある場合（MCPエラー形式）
        if (
          extractedOutput &&
          typeof extractedOutput === "object" &&
          "isError" in extractedOutput &&
          (extractedOutput as { isError?: boolean }).isError === true
        ) {
          isError = true;
        }
      }

      // ラッパーなしで直接 isError がある場合
      if (outputObj.isError === true) {
        isError = true;
      }
    }

    return { output: extractedOutput, isError };
  };

  // ツール結果を収集
  // AI SDK 6では、ツール結果は role: "tool" のメッセージに含まれる
  // 構造: { type: "tool-result", toolCallId, toolName, output: { type: "json", value: {...} }, isError? }
  for (const msg of typedMessages) {
    if (msg.role === "tool") {
      // contentが配列の場合
      if (Array.isArray(msg.content)) {
        for (const content of msg.content) {
          if (content.type === "tool-result" && content.toolCallId) {
            const resultInfo = extractToolResult(
              content.output,
              content.isError,
            );
            toolResultMap.set(content.toolCallId, resultInfo);
          }
        }
      }
      // contentが単一のオブジェクトの場合
      else if (
        typeof msg.content === "object" &&
        msg.content !== null &&
        "toolCallId" in msg.content
      ) {
        const content = msg.content as ContentPart;
        if (content.toolCallId && content.output !== undefined) {
          const resultInfo = extractToolResult(content.output, content.isError);
          toolResultMap.set(content.toolCallId, resultInfo);
        }
      }
    }
  }

  // アシスタントメッセージ内のtool-resultも収集（念のため）
  for (const msg of typedMessages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const content of msg.content) {
        if (content.type === "tool-result" && content.toolCallId) {
          const resultInfo = extractToolResult(content.output, content.isError);
          toolResultMap.set(content.toolCallId, resultInfo);
        }
      }
    }
  }

  // アシスタントメッセージからpartsを構築
  for (const msg of typedMessages) {
    if (msg.role === "assistant") {
      // contentが文字列の場合（テキストのみの応答）
      if (typeof msg.content === "string") {
        if (msg.content.trim()) {
          parts.push({ type: "text", text: msg.content });
        }
        continue;
      }

      // contentが配列の場合
      for (const content of msg.content) {
        if (content.type === "text" && content.text) {
          if (content.text.trim()) {
            parts.push({ type: "text", text: content.text });
          }
        } else if (
          content.type === "tool-call" &&
          content.toolCallId &&
          content.toolName
        ) {
          // UIMessage形式: { type: "tool-{toolName}", toolCallId, state, input, output }
          const toolResultInfo = toolResultMap.get(content.toolCallId);

          // 状態を判定: エラー > 結果あり > 呼び出し中
          let state: "call" | "partial-call" | "result" | "error" = "call";
          if (toolResultInfo !== undefined) {
            state = toolResultInfo.isError ? "error" : "result";
          }

          parts.push({
            type: `tool-${content.toolName}`,
            toolCallId: content.toolCallId,
            state,
            // AI SDK 6: args → input に変更
            input: content.input,
            output: toolResultInfo?.output,
          });
        }
      }
    }
  }

  return parts;
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
    // クライアントはストリーミング終了時に閉じる必要あり
    // @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools#client-lifecycle
    let mcpTools: Record<string, Tool> = {};
    let mcpToolNames: string[] = [];
    const mcpClients: MCPClient[] = [];
    const mcpDebugInfo = {
      selectedMcpServerIds,
      hasAccessToken: !!session.accessToken,
      toolCount: 0,
      toolNames: [] as string[],
      successfulServers: [] as string[],
      errors: [] as Array<{ mcpServerId: string; message: string }>,
    };

    // デバッグログ: MCPツール取得の条件を確認
    console.log("[MCP Debug] selectedMcpServerIds:", selectedMcpServerIds);
    console.log(
      "[MCP Debug] session.accessToken exists:",
      !!session.accessToken,
    );

    if (selectedMcpServerIds.length > 0 && session.accessToken) {
      console.log("[MCP Debug] Fetching MCP tools...");
      const mcpResult = await getMcpToolsFromServers(
        selectedMcpServerIds,
        session.accessToken,
      );
      mcpTools = mcpResult.tools;
      mcpToolNames = mcpResult.toolNames;
      // クライアントを保持（onFinish/onError で閉じるため）
      mcpClients.push(...mcpResult.clients);

      // デバッグ情報を更新
      mcpDebugInfo.toolCount = mcpToolNames.length;
      mcpDebugInfo.toolNames = mcpToolNames;
      mcpDebugInfo.successfulServers = mcpResult.successfulServers;
      mcpDebugInfo.errors = mcpResult.errors.map((e) => ({
        mcpServerId: e.mcpServerId,
        message: e.message,
      }));

      // デバッグログ: 取得結果を出力
      console.log("[MCP Debug] MCP tools fetched:", {
        toolCount: mcpToolNames.length,
        toolNames: mcpToolNames,
        successfulServers: mcpResult.successfulServers,
        errors: mcpResult.errors,
      });

      // MCPサーバーをチャットに紐づけ
      await updateChatMcpServers(id, selectedMcpServerIds);
    } else {
      console.log(
        "[MCP Debug] Skipping MCP tools fetch - no servers selected or no access token",
      );
    }

    // 開発環境でのみデバッグ情報をログ出力
    if (!isProductionEnvironment) {
      console.log("[MCP Debug] Full debug info:", JSON.stringify(mcpDebugInfo));
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
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            mcpToolNames,
          }),
          messages: modelMessages,
          stopWhen: stepCountIs(5),
          activeTools: isReasoningModel ? [] : allActiveToolNames,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: allTools,
          abortSignal: request.signal,
          onFinish: async (finishEvent) => {
            const { response } = finishEvent;

            if (session.user?.id) {
              try {
                // AI SDK 6: response.messagesからUIMessage形式のpartsを構築
                // ツール呼び出しと結果を含めて正しく保存する
                const parts = convertResponseMessagesToUIParts(
                  response.messages,
                );

                if (parts.length === 0) {
                  console.warn("No parts found in response messages");
                  return;
                }

                // 新しいメッセージIDを生成
                const assistantId = generateMessageId();

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: "assistant",
                      parts: parts as unknown as Array<{
                        text: string;
                        type: string;
                      }>,
                      attachments: [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (error) {
                console.error("Failed to save chat:", error);
              }
            }

            // MCPクライアントを閉じる（after で非同期実行）
            // @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools#client-lifecycle
            if (mcpClients.length > 0) {
              after(async () => {
                await closeMcpClients(mcpClients);
              });
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        // streamTextの結果をUIMessageStreamにマージ
        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      onError: (error) => {
        console.error("UIMessageStream error:", error);

        // エラー時もMCPクライアントを閉じる
        // @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools#client-lifecycle
        if (mcpClients.length > 0) {
          after(async () => {
            await closeMcpClients(mcpClients);
          });
        }

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
