import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import type { OrganizationId } from "@/schema/ids";
import type { RoleId } from "../types";
import { TRPCClientError } from "@trpc/client";

export type InvitationResult = {
  email: string;
  success: boolean;
  error?: string;
  invitationId?: string;
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
              // 統一されたエラーハンドリング
              let errorMessage = "招待の送信に失敗しました";

              if (error instanceof TRPCClientError) {
                // TRPCエラーの場合
                const message = error.message;
                if (message.includes("既に招待")) {
                  errorMessage = "このメールアドレスは既に招待されています";
                } else if (message.includes("権限")) {
                  errorMessage = "招待を送信する権限がありません";
                } else if (message.includes("無効")) {
                  errorMessage = "無効なメールアドレスです";
                } else {
                  errorMessage = message;
                }
              } else if (error instanceof Error) {
                errorMessage = error.message;
              }

              return {
                email,
                success: false,
                error: errorMessage,
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
