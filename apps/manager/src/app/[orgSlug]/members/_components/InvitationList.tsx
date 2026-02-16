"use client";

import { useSession } from "next-auth/react";
import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { Badge } from "@tumiki/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@tumiki/ui/alert-dialog";
import { Mail, RefreshCw, X, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { type GetOrganizationBySlugOutput } from "@/features/organization";

type InvitationListProps = {
  organization: GetOrganizationBySlugOutput;
};

export const InvitationList = ({
  organization: _organization,
}: InvitationListProps) => {
  const { data: session } = useSession();
  const { data: invitations, isLoading } =
    api.organization.getInvitations.useQuery();

  const utils = api.useUtils();

  const resendInvitationMutation =
    api.organization.resendInvitation.useMutation({
      onSuccess: () => {
        void utils.organization.getInvitations.invalidate();
      },
    });

  const cancelInvitationMutation =
    api.organization.cancelInvitation.useMutation({
      onSuccess: () => {
        void utils.organization.getInvitations.invalidate();
      },
    });

  const handleResendInvitation = (invitationId: string) => {
    resendInvitationMutation.mutate({ invitationId });
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInvitationMutation.mutate({ invitationId });
  };

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>保留中の招待</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200"></div>
                  <div className="h-3 w-1/4 rounded bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>保留中の招待</CardTitle>
          <p className="text-muted-foreground text-sm">
            承認待ちの招待が {invitations?.length ?? 0} 件あります
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {!invitations || invitations.length === 0 ? (
          <p className="py-4 text-center text-gray-500">
            保留中の招待はありません。
          </p>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(invitation.createdAt).toLocaleDateString(
                        "ja-JP",
                      )}{" "}
                      に招待
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        保留中
                      </Badge>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation.id)}
                      disabled={resendInvitationMutation.isPending}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      再送信
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>招待をキャンセル</AlertDialogTitle>
                          <AlertDialogDescription>
                            {invitation.email} への招待を取消しますか？
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>戻る</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleCancelInvitation(invitation.id)
                            }
                            className="bg-red-600 hover:bg-red-700"
                          >
                            取消
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
