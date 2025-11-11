import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { ServerType, ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { generateApiKey } from "@/utils/server";
import type { CreateMcpServerInput } from ".";
import {
  getMcpServerToolsSSE,
  getMcpServerToolsHTTP,
} from "@/utils/getMcpServerTools";
import { createCloudRunHeaders } from "@/utils/cloudRunAuth";

type CreateMcpServerInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CreateMcpServerInput>;
};

export const createMcpServer = async ({
  ctx,
  input,
}: CreateMcpServerInputProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;

  const currentOrganizationId = ctx.currentOrganizationId;

  // バリデーション: リモートMCPサーバーのみをサポート（STDIOは廃止）
  if (input.transportType === "STDIO") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "STDIOタイプのMCPサーバーはサポートされていません。STREAMABLE_HTTPSまたはSSEを使用してください。",
    });
  }

  // バリデーション: リモートサーバーの場合、URLは必須
  if (
    (input.transportType === "SSE" ||
      input.transportType === "STREAMABLE_HTTPS") &&
    !input.url
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "リモートMCPサーバーの場合、URLは必須です",
    });
  }

  // バリデーション: サポートされている認証タイプのチェック
  if (
    input.authType !== "API_KEY" &&
    input.authType !== "NONE" &&
    input.authType !== "CLOUD_RUN_IAM"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `認証タイプ ${input.authType} は現在サポートされていません。API_KEY、NONE、またはCLOUD_RUN_IAMを使用してください。`,
    });
  }

  // バリデーション: API_KEY認証の場合、envVarsは必須
  if (input.authType === "API_KEY" && Object.keys(input.envVars).length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "API_KEY認証を使用する場合、環境変数（APIキー）の指定が必須です",
    });
  }

  // ユーザーの組織IDを取得（組織限定公開の場合に必要）
  let organizationId: string | null = null;
  if (input.visibility === "ORGANIZATION") {
    const inputOrganizationId = input.organizationId ?? null;
    if (!inputOrganizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "組織限定公開を選択する場合は組織IDが必要です",
      });
    }

    // ユーザーが指定した組織に所属しているかチェック
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          userId,
          organizationId: inputOrganizationId,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "指定された組織に所属していません",
      });
    }

    organizationId = inputOrganizationId;
  }

  // カスタムサーバー検証: Transport TypeとAuth Typeに基づいてツールリストを取得
  let tools;
  try {
    // ヘッダーを準備（Cloud Run IAM認証またはAPIキー）
    let headers = input.envVars;
    if (input.authType === "CLOUD_RUN_IAM") {
      // Cloud Run IAM認証の場合、Authorizationヘッダーを追加
      headers = await createCloudRunHeaders(input.url ?? "", input.envVars);
    }

    // Transport Typeに応じて適切な関数を呼び出し
    if (input.transportType === "STREAMABLE_HTTPS") {
      tools = await getMcpServerToolsHTTP(
        {
          name: input.name,
          url: input.url ?? null,
        },
        headers,
      );
    } else if (input.transportType === "SSE") {
      tools = await getMcpServerToolsSSE(
        {
          name: input.name,
          url: input.url ?? null,
        },
        headers,
      );
    } else {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `サポートされていないTransportType: ${String(input.transportType)}`,
      });
    }

    if (!tools || tools.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "指定されたMCPサーバーのツールが取得できませんでした",
      });
    }
  } catch (error) {
    // より詳細なエラーメッセージを提供
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `MCPサーバーへの接続に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  // トランザクションでMCPサーバーとインスタンスを作成
  const result = await db.$transaction(async (tx) => {
    // MCPサーバーを作成
    const mcpServer = await tx.mcpServer.create({
      include: {
        tools: true,
      },
      data: {
        name: input.name,
        iconPath: input.iconPath,
        transportType: input.transportType,
        command: input.command,
        args: input.args,
        url: input.url,
        envVars: Object.keys(input.envVars),
        authType: input.authType,
        serverType: ServerType.OFFICIAL,
        createdBy: userId,
        visibility: input.visibility,
        organizationId,
        isPublic: true,
        tools: {
          createMany: {
            data: tools.map((tool) => ({
              name: tool.name,
              description: tool.description ?? "",
              inputSchema: tool.inputSchema as object,
            })),
          },
        },
      },
    });

    // ユーザーのMCPサーバー設定を作成
    const serverConfig = await tx.userMcpServerConfig.create({
      data: {
        name: mcpServer.name,
        description: "",
        mcpServerId: mcpServer.id,
        envVars: JSON.stringify(input.envVars),
        organizationId: currentOrganizationId,
      },
    });

    const toolGroupTools = mcpServer.tools.map((tool) => ({
      toolId: tool.id,
      userMcpServerConfigId: serverConfig.id,
    }));

    // ツールグループを作成
    const toolGroup = await tx.userToolGroup.create({
      data: {
        name: mcpServer.name,
        description: "",
        organizationId: currentOrganizationId,
        toolGroupTools: {
          createMany: {
            data: toolGroupTools,
          },
        },
      },
    });

    // APIキーを生成
    const fullKey = generateApiKey();

    // MCPサーバーインスタンスを作成
    const serverInstance = await tx.userMcpServerInstance.create({
      data: {
        name: mcpServer.name,
        description: "",
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        toolGroupId: toolGroup.id,
        organizationId: currentOrganizationId,
        apiKeys: {
          create: {
            name: `${mcpServer.name} API Key`,
            apiKey: fullKey,
            userId,
          },
        },
      },
    });

    return {
      mcpServer,
      serverConfig,
      toolGroup,
      serverInstance,
    };
  });

  return result.mcpServer;
};
