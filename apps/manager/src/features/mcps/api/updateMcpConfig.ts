import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

type UpdateMcpConfigInput = {
  /** テンプレートインスタンスID */
  templateInstanceId: string;
  /** 更新する環境変数 */
  envVars: Record<string, string>;
  organizationId: string;
  userId: string;
};

type UpdateMcpConfigOutput = {
  /** 更新されたMcpConfigのID */
  id: string;
  /** テンプレートインスタンスID */
  templateInstanceId: string;
};

/**
 * テンプレートインスタンスのMcpConfig（環境変数設定）を更新
 *
 * 既存の設定がない場合は新規作成、ある場合は更新します。
 */
export const updateMcpConfig = async (
  tx: PrismaTransactionClient,
  input: UpdateMcpConfigInput,
): Promise<UpdateMcpConfigOutput> => {
  const { templateInstanceId, envVars, organizationId, userId } = input;

  // テンプレートインスタンスと親サーバーを取得して権限確認
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
            envVarKeys: true,
          },
        },
      },
    },
  );

  // 組織の検証
  if (templateInstance.mcpServer.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このリソースを更新する権限がありません",
    });
  }

  // 既存のMcpConfigを取得
  const existingConfig = await tx.mcpConfig.findUnique({
    where: {
      mcpServerTemplateInstanceId_userId_organizationId: {
        mcpServerTemplateInstanceId: templateInstanceId,
        organizationId,
        userId,
      },
    },
  });

  const MASK_VALUE = "•••••";

  // 既存の環境変数を取得（存在する場合）
  const existingEnvVars = existingConfig
    ? (JSON.parse(existingConfig.envVars) as Record<string, string>)
    : {};

  // 新しい値とマスク表示された値をマージ
  // - 新しい値（空でない、マスクでない）: そのまま使用
  // - マスク表示: 既存の値を維持
  // - 空の値: 除外
  const mergedEnvVars = Object.fromEntries(
    Object.entries(envVars)
      .map(([key, value]) => {
        if (value === MASK_VALUE && existingEnvVars[key]) {
          return [key, existingEnvVars[key]] as const;
        }
        if (value && value.trim() !== "" && value !== MASK_VALUE) {
          return [key, value] as const;
        }
        return null;
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );

  const envVarsJson = JSON.stringify(mergedEnvVars);

  // upsert で作成または更新
  const config = await tx.mcpConfig.upsert({
    where: {
      mcpServerTemplateInstanceId_userId_organizationId: {
        mcpServerTemplateInstanceId: templateInstanceId,
        organizationId,
        userId,
      },
    },
    create: {
      mcpServerTemplateInstanceId: templateInstanceId,
      organizationId,
      userId,
      envVars: envVarsJson,
    },
    update: {
      envVars: envVarsJson,
    },
  });

  return {
    id: config.id,
    templateInstanceId,
  };
};
