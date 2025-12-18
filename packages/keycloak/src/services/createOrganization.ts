import type { KeycloakAdminClient } from "../client.js";
import type { OrganizationRole } from "../types.js";

/**
 * 組織グループを作成
 */
export const createOrganization = async (
  client: KeycloakAdminClient,
  params: {
    name: string;
    groupName: string;
    ownerId: string;
  },
  addMemberFn: (params: {
    externalId: string;
    userId: string;
    role: OrganizationRole;
  }) => Promise<{ success: boolean; error?: string }>,
): Promise<{ success: boolean; externalId: string; error?: string }> => {
  // 1. Keycloakにグループを作成
  const createResult = await client.createGroup({
    name: params.groupName,
    attributes: {
      displayName: [params.name],
    },
  });

  if (!createResult.success || !createResult.groupId) {
    return {
      success: false,
      externalId: "",
      error: createResult.error ?? "Failed to create group",
    };
  }

  // 2. OwnerをグループメンバーとしてOwnerロールで追加
  const addMemberResult = await addMemberFn({
    externalId: createResult.groupId,
    userId: params.ownerId,
    role: "Owner",
  });

  if (!addMemberResult.success) {
    // グループ作成は成功したが、メンバー追加に失敗した場合はロールバック
    await client.deleteGroup(createResult.groupId);
    return {
      success: false,
      externalId: "",
      error: addMemberResult.error ?? "Failed to add owner to group",
    };
  }

  return {
    success: true,
    externalId: createResult.groupId,
  };
};
