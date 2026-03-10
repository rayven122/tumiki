import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { RemoveMemberInput } from "@/server/utils/groupSchemas";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * グループメンバー削除（CE版スタブ）
 * CE版では利用不可
 */
export const removeMember = async (
  _db: PrismaTransactionClient,
  _input: RemoveMemberInput,
  _currentOrg: OrganizationInfo,
): Promise<{ success: boolean }> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "グループ管理機能はEnterprise Editionでのみ利用可能です",
  });
};
