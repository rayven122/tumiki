import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

type GetMcpConfigInput = {
  /** テンプレートインスタンスID */
  templateInstanceId: string;
  organizationId: string;
  userId: string;
};

type GetMcpConfigOutput = {
  /** テンプレートインスタンスID */
  templateInstanceId: string;
  /** テンプレート名 */
  templateName: string;
  /** テンプレートのアイコンパス */
  templateIconPath: string | null;
  /** テンプレートのURL */
  templateUrl: string | null;
  /** テンプレートで必要な環境変数キー */
  envVarKeys: string[];
  /** 現在のenvVars（セキュリティのため値はマスク） */
  envVars: Record<string, string>;
  /** McpConfigが存在するか */
  hasConfig: boolean;
};

/**
 * テンプレートインスタンスのMcpConfig（環境変数設定）を取得
 *
 * セキュリティのため、値は取得されずにマスク表示されます（"•••••"）。
 * ユーザーは新しい値を入力して更新する必要があります。
 */
export const getMcpConfig = async (
  tx: PrismaTransactionClient,
  input: GetMcpConfigInput,
): Promise<GetMcpConfigOutput> => {
  const { templateInstanceId, organizationId, userId } = input;

  // テンプレートインスタンスと親サーバー、テンプレートを取得
  const templateInstance = await tx.mcpServerTemplateInstance.findUniqueOrThrow(
    {
      where: { id: templateInstanceId },
      include: {
        mcpServer: {
          select: {
            id: true,
            organizationId: true,
          },
        },
        mcpServerTemplate: {
          select: {
            id: true,
            name: true,
            iconPath: true,
            url: true,
            envVarKeys: true,
            authType: true,
          },
        },
      },
    },
  );

  // 組織の検証
  if (templateInstance.mcpServer.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このリソースにアクセスする権限がありません",
    });
  }

  // McpConfigを取得
  const mcpConfig = await tx.mcpConfig.findUnique({
    where: {
      mcpServerTemplateInstanceId_userId_organizationId: {
        mcpServerTemplateInstanceId: templateInstanceId,
        organizationId,
        userId,
      },
    },
    select: {
      envVars: true,
    },
  });

  const template = templateInstance.mcpServerTemplate;

  // 環境変数キーのマスク表示を生成
  // 設定済みのキーには "•••••" を表示、未設定は空文字
  let envVarsFromConfig: Record<string, string> = {};
  if (mcpConfig) {
    try {
      envVarsFromConfig = JSON.parse(mcpConfig.envVars) as Record<
        string,
        string
      >;
    } catch {
      // JSON解析に失敗した場合は空のオブジェクトを使用
      envVarsFromConfig = {};
    }
  }

  // 値が設定されているかどうかでマスク表示を変える
  const maskedEnvVars = Object.fromEntries(
    template.envVarKeys.map((key) => [
      key,
      envVarsFromConfig[key] ? "•••••" : "",
    ]),
  );

  return {
    templateInstanceId,
    templateName: template.name,
    templateIconPath: template.iconPath,
    templateUrl: template.url,
    envVarKeys: template.envVarKeys,
    envVars: maskedEnvVars,
    hasConfig: !!mcpConfig,
  };
};
