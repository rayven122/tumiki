import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerConfigInput } from ".";

type UpdateServerConfigInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerConfigInput>;
};

/**
 * 新スキーマ：サーバー設定更新（環境変数）
 * - userMcpServerConfig → mcpConfig
 * - input.idはMcpServerIdに変更（インスタンスID）
 * - mcpServer(旧テンプレート) → mcpServerTemplate
 */
export const updateServerConfig = async ({
  ctx,
  input,
}: UpdateServerConfigInputProps) => {
  const currentOrganizationId = ctx.currentOrganizationId;

  // サーバーインスタンスを取得
  const serverInstance = await ctx.db.mcpServer.findUnique({
    where: { id: input.id },
    include: {
      mcpServerTemplates: true,
    },
  });

  if (!serverInstance) {
    throw new Error("サーバーインスタンスが見つかりません");
  }

  // 更新する組織と、MCPサーバーの組織が一致するかチェック
  if (serverInstance.organizationId !== currentOrganizationId) {
    throw new Error("組織のMCPサーバーが見つかりません");
  }

  // 関連するMcpConfigを取得
  const mcpServerTemplate = serverInstance.mcpServerTemplates[0];
  if (!mcpServerTemplate) {
    throw new Error("MCPサーバーテンプレートが見つかりません");
  }

  const mcpConfig = await ctx.db.mcpConfig.findFirst({
    where: {
      mcpServerTemplateId: mcpServerTemplate.id,
      organizationId: currentOrganizationId,
    },
    include: {
      mcpServerTemplate: true,
    },
  });

  if (!mcpConfig) {
    throw new Error("組織のMCPサーバー設定が見つかりません");
  }

  // 環境変数のバリデーション
  if (input.envVars) {
    const envVars = Object.keys(input.envVars);
    const isEnvVarsMatch = envVars.every((envVar) =>
      mcpConfig.mcpServerTemplate?.envVarKeys.includes(envVar),
    );
    if (!isEnvVarsMatch) {
      throw new Error("MCPサーバーの環境変数が一致しません");
    }
  }

  // McpConfigを更新
  return await ctx.db.mcpConfig.update({
    where: { id: mcpConfig.id },
    data: {
      envVars: JSON.stringify(input.envVars),
    },
  });
};
