import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { SaveTokenToEnvVarsInput } from ".";
import { getProviderAccessToken } from "@tumiki/auth/server";
import { ServerStatus } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

type SaveTokenToEnvVarsArgs = {
  ctx: ProtectedContext;
  input: z.infer<typeof SaveTokenToEnvVarsInput>;
};

export const saveTokenToEnvVars = async ({
  ctx,
  input,
}: SaveTokenToEnvVarsArgs) => {
  const { userMcpServerConfigId, provider, tokenKey } = input;

  // 1. UserMcpServerConfigを取得
  const userMcpServerConfig = await ctx.db.userMcpServerConfig.findUnique({
    where: { id: userMcpServerConfigId },
    include: { mcpServer: true },
  });

  if (!userMcpServerConfig) {
    throw new Error("MCPサーバー設定が見つかりません");
  }

  // 2. ユーザーの所有権を確認
  if (userMcpServerConfig.userId !== ctx.session.user.id) {
    throw new Error("このMCPサーバー設定にアクセスする権限がありません");
  }

  // 3. MCPサーバーが指定されたtokenKeyを環境変数として持っているか確認
  if (!userMcpServerConfig.mcpServer.envVars.includes(tokenKey)) {
    throw new Error(
      `このMCPサーバーは${tokenKey}環境変数をサポートしていません`,
    );
  }

  // 4. OAuthプロバイダーからアクセストークンを取得
  const accessToken = await getProviderAccessToken(provider);

  if (!accessToken) {
    throw new Error(`${provider}のアクセストークンが取得できませんでした`);
  }

  // 5. 既存のenvVarsを取得してパース
  let envVars: Record<string, string>;
  try {
    envVars = JSON.parse(userMcpServerConfig.envVars) as Record<string, string>;
  } catch {
    // envVarsが空または無効な場合は新規作成
    envVars = {};
  }

  // 6. tokenKeyにアクセストークンを設定
  envVars[tokenKey] = accessToken;

  // 7. envVarsを更新
  const updatedConfig = await ctx.db.userMcpServerConfig.update({
    where: { id: userMcpServerConfigId },
    data: {
      envVars: JSON.stringify(envVars),
      // OAuth接続情報も更新
      oauthConnection: provider,
      oauthScopes: input.scopes ?? [],
    },
    include: {
      userToolGroupTools: {
        include: {
          toolGroup: {
            include: {
              mcpServerInstance: true,
            },
          },
        },
      },
    },
  });

  // 8. 関連するUserMcpServerInstanceのステータスをRUNNINGに更新
  if (updatedConfig.userToolGroupTools[0]?.toolGroup.mcpServerInstance) {
    const instance =
      updatedConfig.userToolGroupTools[0].toolGroup.mcpServerInstance;

    // ステータスをRUNNINGに更新
    await ctx.db.userMcpServerInstance.update({
      where: { id: instance.id },
      data: {
        serverStatus: ServerStatus.RUNNING,
      },
    });

    // APIキーがまだない場合は作成
    const hasApiKey = await ctx.db.mcpApiKey.findFirst({
      where: { userMcpServerInstanceId: instance.id },
    });

    if (!hasApiKey) {
      const fullKey = generateApiKey();
      await ctx.db.mcpApiKey.create({
        data: {
          name: `${instance.name} API Key`,
          apiKey: fullKey,
          userId: ctx.session.user.id,
          userMcpServerInstanceId: instance.id,
        },
      });
    }
  }

  return {
    success: true,
    message: `${provider}のアクセストークンが${tokenKey}に保存されました`,
    configId: updatedConfig.id,
  };
};
