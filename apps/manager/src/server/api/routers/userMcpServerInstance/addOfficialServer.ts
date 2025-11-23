import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";

import type { AddOfficialServerInput } from ".";
import { createUserServerComponents } from "../_shared/createUserServerComponents";

type AddOfficialServerInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddOfficialServerInput>;
};

/**
 * 新スキーマ：公式サーバーを追加
 * - mcpServerId → mcpServerTemplateId
 * - テーブル: McpServer → McpServerTemplate
 * - tools → mcpTools
 */
export const addOfficialServer = async ({
  ctx,
  input,
}: AddOfficialServerInputProps) => {
  const mcpServerTemplate = await ctx.db.mcpServerTemplate.findUnique({
    where: { id: input.mcpServerTemplateId },
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
    mcpServerTemplate.envVars.includes(envVar),
  );
  if (!isEnvVarsMatch && !input.isPending) {
    throw new Error("MCPサーバーの環境変数が一致しません");
  }

  const organizationId = ctx.currentOrganizationId;

  // 共通関数を使用してユーザー固有のコンポーネントを作成
  const data = await ctx.db.$transaction(async (tx) => {
    return await createUserServerComponents({
      tx,
      mcpServerTemplateId: mcpServerTemplate.id,
      allowedToolIds: mcpServerTemplate.mcpTools.map((tool) => tool.id),
      envVars: input.envVars,
      instanceName: input.name,
      instanceDescription: input.description ?? "",
      organizationId,
      userId: ctx.session.user.id,
      isPending: input.isPending,
    });
  });

  // authType: NONEかつenvVars: []の場合は接続検証をスキップ
  const skipValidation =
    mcpServerTemplate.authType === "NONE" &&
    mcpServerTemplate.envVars.length === 0;

  return {
    id: data.server.id,
    mcpConfigId: data.config.id,
    skipValidation,
  };
};
