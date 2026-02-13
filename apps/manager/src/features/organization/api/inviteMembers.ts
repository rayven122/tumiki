import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";

// 入力スキーマ（型互換性のため維持）
export const inviteMembersInputSchema = z.object({
  emails: z
    .array(z.string().email("有効なメールアドレスを入力してください"))
    .min(1, "少なくとも1つのメールアドレスが必要です")
    .max(50, "一度に招待できるのは最大50人までです"),
  roles: z.array(z.string()).default(["Member"]), // デフォルトロール
});

// 出力スキーマ（型互換性のため維持）
export const inviteMembersOutputSchema = z.object({
  succeeded: z.array(
    z.object({
      email: z.string(),
      id: z.string(),
      token: z.string(),
      expires: z.date(),
    }),
  ),
  failed: z.array(
    z.object({
      email: z.string(),
      reason: z.string(),
    }),
  ),
  total: z.number(),
});

export type InviteMembersInput = z.infer<typeof inviteMembersInputSchema>;
export type InviteMembersOutput = z.infer<typeof inviteMembersOutputSchema>;

/**
 * メンバー招待（CE版スタブ）
 * CE版では利用不可
 */
export const inviteMembers = async (_params: {
  input: InviteMembersInput;
  ctx: ProtectedContext;
}): Promise<InviteMembersOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "メンバー招待機能はEnterprise Editionでのみ利用可能です",
  });
};
