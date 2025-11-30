import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";

import type { AddOfficialServerInput } from ".";
import { createUserServerComponents } from "../_shared/createUserServerComponents";

type AddOfficialServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddOfficialServerInput>;
};

export const addOfficialServer = async ({
  ctx,
  input,
}: AddOfficialServerInput) => {
  const mcpServerTemplate = await ctx.db.mcpServerTemplate.findUnique({
    where: { id: input.mcpServerId },
    include: {
      mcpTools: true,
    },
  });
  if (!mcpServerTemplate) {
    throw new Error("MCPサーバーテンプレートが見つかりません");
  }

  // STDIOタイプのMCPサーバーは廃止済みのため拒否
  if (mcpServerTemplate.transportType === "STDIO") {
    throw new Error(
      "STDIOタイプのMCPサーバーはサポートされていません。リモートMCPサーバーを使用してください。",
    );
  }

  const envVars = Object.keys(input.envVars);
  const isEnvVarsMatch = envVars.every((envVar) =>
    mcpServerTemplate.envVarKeys.includes(envVar),
  );
  if (!isEnvVarsMatch && !input.isPending) {
    throw new Error("MCPサーバーの環境変数が一致しません");
  }

  const organizationId = ctx.currentOrganizationId;

  // 共通関数を使用してユーザー固有のコンポーネントを作成
  // mcpTools を tools にマッピング
  const mcpServer = {
    id: mcpServerTemplate.id,
    tools: mcpServerTemplate.mcpTools,
  };

  const data = await ctx.db.$transaction(async (tx) => {
    return await createUserServerComponents({
      tx,
      mcpServer,
      envVars: input.envVars,
      instanceName: input.name,
      instanceDescription: input.description ?? "",
      organizationId,
      userId: ctx.session.user.id,
      isPending: input.isPending,
    });
  });

  // authType: NONEかつenvVarKeys: []の場合は接続検証をスキップ
  const skipValidation =
    mcpServerTemplate.authType === "NONE" &&
    mcpServerTemplate.envVarKeys.length === 0;

  return {
    id: data.instance.id,
    userMcpServerConfigId: data.serverConfig.id,
    toolGroupId: data.toolGroup.id,
    skipValidation,
  };
};
