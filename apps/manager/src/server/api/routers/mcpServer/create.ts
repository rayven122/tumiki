import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { ServerType, ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { generateApiKey } from "../mcpApiKey";
import type { CreateMcpServerInput } from ".";

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

  // 同じ名前のサーバーが既に存在するかチェック
  const existingServer = await db.mcpServer.findUnique({
    where: { name: input.name },
  });

  if (existingServer) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "同じ名前のMCPサーバーが既に存在します",
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

  // トランザクションでMCPサーバーとインスタンスを作成
  const result = await db.$transaction(async (tx) => {
    // MCPサーバーを作成
    const mcpServer = await tx.mcpServer.create({
      data: {
        name: input.name,
        iconPath: input.iconPath,
        transportType: input.transportType,
        command: input.command,
        args: input.args,
        url: input.url,
        envVars: input.envVars,
        serverType: ServerType.OFFICIAL,
        createdBy: userId,
        visibility: input.visibility,
        organizationId,
        isPublic: true,
      },
    });

    // ユーザーのMCPサーバー設定を作成
    const serverConfig = await tx.userMcpServerConfig.create({
      data: {
        userId,
        name: mcpServer.name,
        description: "",
        mcpServerId: mcpServer.id,
        envVars: JSON.stringify({}), // 初期状態では空のオブジェクト
        organizationId,
      },
    });

    // ツールグループを作成
    const toolGroup = await tx.userToolGroup.create({
      data: {
        userId,
        name: mcpServer.name,
        description: "",
        organizationId,
      },
    });

    // MCPサーバーインスタンスを作成
    const serverInstance = await tx.userMcpServerInstance.create({
      data: {
        userId,
        name: mcpServer.name,
        description: "",
        serverStatus: ServerStatus.STOPPED,
        serverType: ServerType.CUSTOM,
        toolGroupId: toolGroup.id,
        organizationId,
      },
    });

    // APIキーを生成
    const fullKey = generateApiKey();
    await tx.mcpApiKey.create({
      data: {
        name: `${mcpServer.name} API Key`,
        apiKey: fullKey,
        userMcpServerInstanceId: serverInstance.id,
        userId,
        organizationId,
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
