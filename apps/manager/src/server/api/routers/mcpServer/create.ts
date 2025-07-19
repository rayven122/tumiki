import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { ServerType, ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { generateApiKey } from "../mcpApiKey";
import type { CreateMcpServerInput } from ".";
import { getMcpServerToolsSSE } from "@tumiki/utils/server";

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

  // バリデーション
  if (input.transportType === "SSE" && !input.url) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "SSEタイプの場合、URLは必須です",
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

  const tools = await getMcpServerToolsSSE(
    {
      name: input.name,
      url: input.url ?? null,
    },
    input.envVars,
  );
  if (tools.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "指定されたMCPサーバーのツールが取得できませんでした",
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
        userId,
        name: mcpServer.name,
        description: "",
        mcpServerId: mcpServer.id,
        envVars: JSON.stringify(input.envVars),
        organizationId,
        tools: {
          connect: mcpServer.tools.map((tool) => ({ id: tool.id })),
        },
      },
    });

    const toolGroupTools = mcpServer.tools.map((tool) => ({
      toolId: tool.id,
      userMcpServerConfigId: serverConfig.id,
    }));

    // ツールグループを作成
    const toolGroup = await tx.userToolGroup.create({
      data: {
        userId,
        name: mcpServer.name,
        description: "",
        organizationId,
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
        userId,
        name: mcpServer.name,
        description: "",
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        toolGroupId: toolGroup.id,
        organizationId,
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
