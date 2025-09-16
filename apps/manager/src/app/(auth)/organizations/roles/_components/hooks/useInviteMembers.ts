import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import type { OrganizationId } from "@/schema/ids";
import type { RoleId, InvitationResult } from "../types";
import { TRPCClientError } from "@trpc/client";

// 統一されたエラーハンドリング関数
const getInvitationErrorMessage = (error: unknown): string => {
  if (error instanceof TRPCClientError) {
    const message = error.message;
    if (message.includes("既に招待")) {
      return "このメールアドレスは既に招待されています";
    } else if (message.includes("権限")) {
      return "招待を送信する権限がありません";
    } else if (message.includes("無効")) {
      return "無効なメールアドレスです";
    } else {
      return message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return "招待の送信に失敗しました";
};

export const useInviteMembers = (_organizationId: OrganizationId) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationResults, setInvitationResults] = useState<
    InvitationResult[]
  >([]);
  const utils = api.useUtils();
  const inviteMemberMutation = api.organization.inviteMember.useMutation();

  const inviteMembers = useCallback(
    async (
      emails: string[],
      selectedRoleId: RoleId | "",
      isAdmin: boolean,
    ): Promise<InvitationResult[]> => {
      setIsSubmitting(true);
      setInvitationResults([]);

      try {
        const results = await Promise.all(
          emails.map(async (email) => {
            try {
              const result = await inviteMemberMutation.mutateAsync({
                email,
                isAdmin,
                roleIds: selectedRoleId ? [selectedRoleId as string] : [],
                groupIds: [],
              });

              return {
                email,
                success: true,
                invitationId: result.id,
              };
            } catch (error) {
              return {
                email,
                success: false,
                error: getInvitationErrorMessage(error),
              };
            }
          }),
        );

        setInvitationResults(results);

        // 成功した場合はキャッシュを無効化
        const hasSuccess = results.some((r) => r.success);
        if (hasSuccess) {
          await utils.organization.getInvitations.invalidate();
          await utils.organizationRole.getByOrganization.invalidate();
        }

        return results;
      } finally {
        setIsSubmitting(false);
      }
    },
    [inviteMemberMutation, utils],
  );

  const resetResults = useCallback(() => {
    setInvitationResults([]);
  }, []);

  return {
    inviteMembers,
    isSubmitting,
    invitationResults,
    resetResults,
  };
};
