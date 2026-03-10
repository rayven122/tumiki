import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { CreateGroupInput } from "@/server/utils/groupSchemas";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * グループ作成（CE版スタブ）
 * CE版では利用不可
 */
export const createGroup = async (
  _db: PrismaTransactionClient,
  _input: CreateGroupInput,
  _currentOrg: OrganizationInfo,
): Promise<{ id: string; name: string }> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "グループ管理機能はEnterprise Editionでのみ利用可能です",
  });
};
