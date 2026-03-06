import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { DeleteGroupInput } from "@/server/utils/groupSchemas";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * グループ削除（CE版スタブ）
 * CE版では利用不可
 */
export const deleteGroup = async (
  _db: PrismaTransactionClient,
  _input: DeleteGroupInput,
  _currentOrg: OrganizationInfo,
): Promise<{ success: boolean }> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "グループ管理機能はEnterprise Editionでのみ利用可能です",
  });
};
