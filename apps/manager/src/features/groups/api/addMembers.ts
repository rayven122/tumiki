import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type {
  AddMembersInput,
  AddMembersResult,
} from "@/server/utils/groupSchemas";
import type { OrganizationInfo } from "@/server/utils/organizationPermissions";

/**
 * グループへの複数メンバー一括追加（CE版スタブ）
 * CE版では利用不可
 */
export const addMembers = async (
  _db: PrismaTransactionClient,
  _input: AddMembersInput,
  _currentOrg: OrganizationInfo,
): Promise<AddMembersResult> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "グループ管理機能はEnterprise Editionでのみ利用可能です",
  });
};
