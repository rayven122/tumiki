"use client";

import { useState } from "react";
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
import { Mail, Clock, RefreshCw, X, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import { type OrganizationInvitationId } from "@/schema/ids";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@tumiki/ui/alert";

// 定数定義
const ANIMATION_DURATION = 3000; // アニメーション表示時間（ミリ秒）

// クライアントサイドでステータスを計算するヘルパー関数
const getInvitationStatus = (expiresDate: Date): "pending" | "expired" => {
  const now = new Date();
  return expiresDate < now ? "expired" : "pending";
};

export const InvitationManagementSection = () => {
  const { data: session } = useSession();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState({
    title: "",
    description: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);

  const { data: invitations, isLoading } =
    api.organization.getInvitations.useQuery();

  const utils = api.useUtils();

  const resendInvitationMutation =
    api.organization.resendInvitation.useMutation({
      onSuccess: () => {
        setSuccessMessage({
          title: "招待を再送信しました！",
          description: "新しい招待メールが送信されました。",
        });
        setShowSuccessAnimation(true);
        void utils.organization.getInvitations.invalidate();
        setTimeout(() => {
          setShowSuccessAnimation(false);
        }, ANIMATION_DURATION);
      },
      onError: (error) => {
        setErrorMessage(
          error.message || "招待の再送信中にエラーが発生しました。",
        );
        setShowErrorAnimation(true);
        setTimeout(() => {
          setShowErrorAnimation(false);
          setErrorMessage(null);
        }, ANIMATION_DURATION);
      },
    });

  const cancelInvitationMutation =
    api.organization.cancelInvitation.useMutation({
      onSuccess: () => {
        setSuccessMessage({
          title: "招待をキャンセルしました",
          description: "この招待は無効になりました。",
        });
        setShowSuccessAnimation(true);
        void utils.organization.getInvitations.invalidate();
        setTimeout(() => {
          setShowSuccessAnimation(false);
        }, ANIMATION_DURATION);
      },
      onError: (error) => {
        setErrorMessage(
          error.message || "招待のキャンセル中にエラーが発生しました。",
        );
        setShowErrorAnimation(true);
        setTimeout(() => {
          setShowErrorAnimation(false);
          setErrorMessage(null);
        }, ANIMATION_DURATION);
      },
    });

  const handleResendInvitation = (invitationId: OrganizationInvitationId) => {
    resendInvitationMutation.mutate({
      invitationId,
    });
  };

  const handleCancelInvitation = (invitationId: OrganizationInvitationId) => {
    cancelInvitationMutation.mutate({
      invitationId,
    });
  };

  // 現在のログインユーザーの権限を確認（JWT のロールから取得）
  const isAdmin = getSessionInfo(session).isAdmin;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            招待中のユーザー
          </CardTitle>
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

  const pendingInvitations =
    invitations?.filter(
      (inv) => getInvitationStatus(new Date(inv.expires)) === "pending",
    ) ?? [];
  const expiredInvitations =
    invitations?.filter(
      (inv) => getInvitationStatus(new Date(inv.expires)) === "expired",
    ) ?? [];

  return (
    <>
      {/* 成功時のアニメーション */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <SuccessAnimation
            title={successMessage.title}
            description={successMessage.description}
            className=""
          />
        </div>
      )}

      {/* エラー表示 */}
      {showErrorAnimation && errorMessage && (
        <div className="fixed right-4 bottom-4 z-50 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            招待中のユーザー
          </CardTitle>
          {pendingInvitations.length > 0 && (
            <Badge variant="secondary">
              {pendingInvitations.length}件の保留中
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {!invitations || invitations.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              招待中のユーザーはいません。
            </p>
          ) : (
            <div className="space-y-4">
              {/* 保留中の招待 */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Clock className="h-4 w-4" />
                    保留中の招待
                  </h3>
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{invitation.email}</div>
                          {invitation.roles.some(
                            (role) => role === "Owner" || role === "Admin",
                          ) && (
                            <Badge variant="default" className="text-xs">
                              管理者として招待
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                          <span>
                            招待者: {invitation.invitedByUser.name ?? "不明"}
                          </span>
                          <span>
                            送信日時:{" "}
                            {format(
                              new Date(invitation.createdAt),
                              "yyyy年MM月dd日 HH:mm",
                              { locale: ja },
                            )}
                          </span>
                          <span className="text-orange-600">
                            有効期限:{" "}
                            {formatDistanceToNow(new Date(invitation.expires), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleResendInvitation(invitation.id)
                            }
                            disabled={resendInvitationMutation.isPending}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            再送信
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  招待をキャンセル
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {invitation.email}{" "}
                                  への招待をキャンセルしますか？
                                  招待リンクは無効になります。
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
                                  キャンセル
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

              {/* 期限切れの招待 */}
              {expiredInvitations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <X className="h-4 w-4" />
                    期限切れの招待
                  </h3>
                  {expiredInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex-1 opacity-60">
                        <div className="font-medium">{invitation.email}</div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                          <span>
                            招待者: {invitation.invitedByUser.name ?? "不明"}
                          </span>
                          <span>
                            期限切れ:{" "}
                            {format(
                              new Date(invitation.expires),
                              "yyyy年MM月dd日",
                              { locale: ja },
                            )}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleResendInvitation(invitation.id)
                            }
                            disabled={resendInvitationMutation.isPending}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            再招待
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>招待を削除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {invitation.email}{" "}
                                  への招待記録を削除しますか？
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>戻る</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleCancelInvitation(invitation.id)
                                  }
                                >
                                  削除
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
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
