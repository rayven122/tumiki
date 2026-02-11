// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { sendInvitationEmail } from "@/server/lib/mail";
import { generateInviteUrl } from "@/lib/url";
import { createManyNotifications } from "@/features/notification";

// 入力スキーマ
export const inviteMembersInputSchema = z.object({
  emails: z
    .array(z.string().email("有効なメールアドレスを入力してください"))
    .min(1, "少なくとも1つのメールアドレスが必要です")
    .max(50, "一度に招待できるのは最大50人までです"),
  roles: z.array(z.string()).default(["Member"]), // デフォルトロール
});

// 出力スキーマ
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
 * 複数のメンバーを一度に招待する（EE版）
 *
 * @param input - 招待するメールアドレスのリストと権限情報
 * @param ctx - 保護されたコンテキスト
 * @returns 成功と失敗の詳細
 */
export const inviteMembers = async ({
  input,
  ctx,
}: {
  input: InviteMembersInput;
  ctx: ProtectedContext;
}): Promise<InviteMembersOutput> => {
  try {
    // メンバー招待権限を検証
    validateOrganizationAccess(ctx.currentOrg, {
      requirePermission: "member:invite",
      requireTeam: true,
    });

    const succeeded: InviteMembersOutput["succeeded"] = [];
    const failed: InviteMembersOutput["failed"] = [];

    // 重複を除去
    const uniqueEmails = [...new Set(input.emails)];

    // 組織情報を取得
    const organization = await ctx.db.organization.findUnique({
      where: { id: ctx.currentOrg.id },
      select: { name: true },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "組織が見つかりません",
      });
    }

    // トランザクションで処理
    await ctx.db.$transaction(async (tx) => {
      for (const email of uniqueEmails) {
        try {
          // 既存の招待をチェック
          const existingInvitation = await tx.organizationInvitation.findFirst({
            where: {
              email,
              organizationId: ctx.currentOrg.id,
            },
          });

          if (existingInvitation) {
            failed.push({
              email,
              reason: "既に招待されています",
            });
            continue;
          }

          // 既存のメンバーをチェック
          const existingMember = await tx.organizationMember.findFirst({
            where: {
              organizationId: ctx.currentOrg.id,
              user: {
                email,
              },
            },
          });

          if (existingMember) {
            failed.push({
              email,
              reason: "既に組織のメンバーです",
            });
            continue;
          }

          // 有効期限を設定（7日後）
          const expires = new Date();
          expires.setDate(expires.getDate() + 7);

          // 新しいトークンを生成
          const token = createId();

          // 招待を作成
          const invitation = await tx.organizationInvitation.create({
            data: {
              organizationId: ctx.currentOrg.id,
              email,
              token,
              invitedBy: ctx.session.user.id,
              roles: input.roles,
              expires,
            },
          });

          // 招待されたユーザーが既存ユーザーの場合、本人に通知を送信
          const invitedUserResult: {
            id: string;
            members: { organizationId: string }[];
          } | null = await tx.user.findUnique({
            where: { email },
            select: {
              id: true,
              // 個人組織を取得（OrganizationMemberを通じて）
              members: {
                where: { organization: { isPersonal: true } },
                select: { organizationId: true },
                take: 1,
              },
            },
          });

          if (invitedUserResult) {
            const firstOrg = invitedUserResult.members[0];
            if (firstOrg) {
              const inviteUrl = generateInviteUrl(token);
              await createManyNotifications(tx, [invitedUserResult.id], {
                type: "ORGANIZATION_INVITATION_RECEIVED",
                priority: "HIGH",
                title: `${organization.name}への招待`,
                message: `${ctx.session.user.email ?? "管理者"}から${organization.name}への参加招待が届きました。`,
                linkUrl: inviteUrl,
                organizationId: firstOrg.organizationId,
                triggeredById: ctx.session.user.id,
              });
            }
          }

          succeeded.push({
            email,
            id: invitation.id,
            token,
            expires: invitation.expires,
          });
        } catch (error) {
          // 個別のエラーを記録
          failed.push({
            email,
            reason:
              error instanceof Error
                ? error.message
                : "招待の作成に失敗しました",
          });
        }
      }
    });

    // メール送信処理（トランザクション外で並列実行）
    await Promise.allSettled(
      succeeded.map(async (invitation) => {
        const inviteUrl = generateInviteUrl(invitation.token);

        await sendInvitationEmail(
          invitation.email,
          inviteUrl,
          organization.name,
          input.roles,
          invitation.expires.toISOString(),
        );
      }),
    );

    return {
      succeeded,
      failed,
      total: uniqueEmails.length,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("複数招待作成エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待の作成中にエラーが発生しました。",
    });
  }
};
