import { McpServerVisibility } from "@tumiki/db";

/**
 * エージェントへのアクセス権限チェック条件を生成する
 * 作成者自身または組織内可視性のエージェントにアクセス可能
 */
export const buildAgentAccessCondition = (
  organizationId: string,
  userId: string,
) => ({
  OR: [
    // 作成者自身
    {
      organizationId,
      createdById: userId,
    },
    // 組織内可視性
    {
      organizationId,
      visibility: McpServerVisibility.ORGANIZATION,
    },
  ],
});
