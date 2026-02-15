/**
 * チャットAPIエンドポイント
 *
 * managerの/api/chatをmcp-proxyに移行したもの。
 * クライアントが直接mcp-proxyと通信できるようにする。
 */

import { Hono } from "hono";
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  stepCountIs,
  type UIMessageStreamWriter,
  type Tool,
} from "ai";

import { db, type Prisma } from "@tumiki/db/server";

import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import { generateCUID } from "../../shared/utils/cuid.js";
import { postRequestBodySchema } from "./schema.js";
import { verifyChatAuth } from "./chatJwtAuth.js";
import { getChatMcpTools } from "./chatMcpTools.js";
import { systemPrompt } from "./prompts.js";
import { convertDBMessagesToAISDK6Format } from "./messageConverter.js";
import { buildStreamTextConfig } from "../execution/shared/index.js";

export const chatRoute = new Hono<HonoEnv>().post("/chat", async (c) => {
  // リクエストボディをパース
  let requestBody;
  try {
    const json: unknown = await c.req.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    logError("Failed to parse request body", error as Error);
    return c.json(
      {
        code: "bad_request:api",
        message: "Invalid request body",
      },
      400,
    );
  }

  const {
    id: chatId,
    organizationId,
    message,
    selectedChatModel,
    selectedVisibilityType,
    selectedMcpServerIds,
    isCoharuEnabled,
  } = requestBody;

  // JWT認証を実行
  const authResult = await verifyChatAuth(
    c.req.header("Authorization"),
    organizationId,
  );

  if (!authResult.success) {
    const errorResponse = {
      code: `${authResult.error.code}:chat`,
      message: authResult.error.message,
    };
    // 認証エラーコードに応じたHTTPステータスを返す
    switch (authResult.error.code) {
      case "unauthorized":
        return c.json(errorResponse, 401);
      case "forbidden":
        return c.json(errorResponse, 403);
      default:
        return c.json(errorResponse, 400);
    }
  }

  const { userId } = authResult.context;

  try {
    // チャットの存在確認と権限チェック
    const existingChat = await db.chat.findUnique({
      where: { id: chatId },
    });

    if (!existingChat) {
      // 新規チャット作成
      // タイトルはとりあえずメッセージの先頭部分を使用
      const firstTextPart = message.parts.find((p) => p.type === "text") as
        | { type: "text"; text: string }
        | undefined;
      const title = firstTextPart?.text?.substring(0, 50) ?? "New Chat";

      await db.chat.create({
        data: {
          id: chatId,
          userId,
          organizationId,
          title,
          visibility: selectedVisibilityType,
          createdAt: new Date(),
        },
      });
    } else {
      // 権限チェック
      if (existingChat.userId !== userId) {
        // 他のユーザーのチャットの場合、組織共有かつ同一組織のみアクセス可能
        if (
          existingChat.visibility !== "ORGANIZATION" ||
          existingChat.organizationId !== organizationId
        ) {
          return c.json(
            {
              code: "forbidden:chat",
              message: "Access denied to this chat",
            },
            403,
          );
        }
      }
    }

    // 過去のメッセージを取得
    const previousMessages = await db.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    // ユーザーメッセージを保存
    await db.message.create({
      data: {
        id: message.id,
        chatId,
        role: "user",
        parts: message.parts,
        attachments: message.experimental_attachments ?? [],
        createdAt: new Date(),
      },
    });

    // DBメッセージをAI SDK 6形式に変換
    const dbMessages = previousMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts as unknown[],
    }));

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

    // MCPツールを取得
    let mcpTools: Record<string, Tool> = {};
    let mcpToolNames: string[] = [];

    if (selectedMcpServerIds.length > 0) {
      const mcpResult = await getChatMcpTools({
        mcpServerIds: selectedMcpServerIds,
        organizationId,
        userId,
      });
      mcpTools = mcpResult.tools;
      mcpToolNames = mcpResult.toolNames;

      // MCPサーバーとの関連を更新
      await db.chat.update({
        where: { id: chatId },
        data: {
          mcpServers: {
            set: selectedMcpServerIds.map((id) => ({ id })),
          },
        },
      });

      logInfo("MCP tools loaded", {
        toolCount: mcpToolNames.length,
        toolNames: mcpToolNames,
      });
    }

    // LLM呼び出し設定を構築
    const llmConfig = buildStreamTextConfig({
      modelId: selectedChatModel,
      systemPrompt: systemPrompt({
        selectedChatModel,
        mcpToolNames,
        isCoharuEnabled,
      }),
      mcpToolNames,
      mcpTools,
    });

    // ストリーミングレスポンスを作成
    const stream = createUIMessageStream({
      generateId: generateCUID,
      execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
        const result = streamText({
          ...llmConfig,
          messages: modelMessages,
          stopWhen: stepCountIs(5),
        });

        // streamTextの結果をUIMessageStreamにマージ
        const uiMessageStream = result.toUIMessageStream({
          sendReasoning: true,
        });

        writer.merge(uiMessageStream);
      },
      onFinish: async ({ messages: finishedMessages }) => {
        try {
          // 元のメッセージIDをセットに保存してフィルタリングを高速化
          const originalMessageIds = new Set(allMessages.map((m) => m.id));

          // 新しいアシスタントメッセージのみを保存
          const newAssistantMessages = finishedMessages.filter(
            (msg) =>
              msg.role === "assistant" && !originalMessageIds.has(msg.id),
          );

          if (newAssistantMessages.length > 0) {
            await db.message.createMany({
              data: newAssistantMessages.map((msg) => ({
                id: msg.id,
                chatId,
                role: "assistant" as const,
                // partsはUIMessageのパーツ配列をPrisma JsonValueとして保存
                parts: msg.parts as unknown as Prisma.InputJsonValue[],
                attachments: [],
                createdAt: new Date(),
              })),
            });
          }
        } catch (error) {
          logError("Failed to save assistant messages", error as Error);
        }
      },
      onError: (error) => {
        logError("UIMessageStream error", error as Error);
        return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError("Chat API error", err);

    // 内部エラー詳細は本番環境では返さない
    return c.json(
      {
        code: "internal_error:chat",
        message: "An internal error occurred while processing your message.",
      },
      500,
    );
  }
});
