import { z } from "zod";

/**
 * グループ一覧取得の入力スキーマ
 */
export const listGroupsInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
});

/**
 * グループ作成の入力スキーマ
 */
export const createGroupInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  name: z
    .string()
    .min(1, "グループ名は必須です")
    .max(100, "グループ名は100文字以内で入力してください"),
  parentGroupId: z.string().optional(),
});

/**
 * グループ削除の入力スキーマ
 */
export const deleteGroupInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  groupId: z.string().min(1, "グループIDは必須です"),
});

/**
 * グループ詳細取得の入力スキーマ
 */
export const getGroupByIdInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  groupId: z.string().min(1, "グループIDは必須です"),
});

/**
 * メンバー追加の入力スキーマ
 */
export const addMemberInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  groupId: z.string().min(1, "グループIDは必須です"),
  userId: z.string().min(1, "ユーザーIDは必須です"),
});

/**
 * メンバー削除の入力スキーマ
 */
export const removeMemberInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  groupId: z.string().min(1, "グループIDは必須です"),
  userId: z.string().min(1, "ユーザーIDは必須です"),
});

/**
 * グループ情報の出力型
 * KeycloakのGroupRepresentationに合わせた定義
 *
 * 再帰的な型定義：subGroupsは自身の配列を含む
 */
export type GroupOutput = {
  id?: string;
  name?: string;
  path?: string;
  subGroups?: GroupOutput[];
  attributes?: Record<string, string[]>;
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
  access?: Record<string, boolean>;
};

/**
 * グループ情報の出力スキーマ
 * z.lazy()を使用した再帰的スキーマ定義
 */
export const groupOutputSchema: z.ZodType<GroupOutput> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    path: z.string().optional(),
    subGroups: z.array(groupOutputSchema).optional(),
    attributes: z.record(z.string(), z.array(z.string())).optional(),
    realmRoles: z.array(z.string()).optional(),
    clientRoles: z.record(z.string(), z.array(z.string())).optional(),
    access: z.record(z.string(), z.boolean()).optional(),
  }),
);

/**
 * グループメンバー取得の入力スキーマ
 */
export const getGroupMembersInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  groupIds: z.array(z.string().min(1, "グループIDは必須です")),
});

/**
 * メンバー情報の出力スキーマ
 */
export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  initials: z.string(),
});

/**
 * グループ移動の入力スキーマ
 */
export const moveGroupInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  groupId: z.string().min(1, "グループIDは必須です"),
  newParentGroupId: z.string().min(1, "新しい親グループIDは必須です"),
});

export type ListGroupsInput = z.infer<typeof listGroupsInputSchema>;
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
export type DeleteGroupInput = z.infer<typeof deleteGroupInputSchema>;
export type GetGroupByIdInput = z.infer<typeof getGroupByIdInputSchema>;
export type AddMemberInput = z.infer<typeof addMemberInputSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>;
export type GetGroupMembersInput = z.infer<typeof getGroupMembersInputSchema>;
export type MoveGroupInput = z.infer<typeof moveGroupInputSchema>;
export type Member = z.infer<typeof memberSchema>;
