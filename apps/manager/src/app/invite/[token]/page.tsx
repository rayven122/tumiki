"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircleIcon, ClockIcon, MailIcon, XCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

/**
 * 招待受諾ページ
 * 招待トークンから招待を検証し、受諾処理を行う
 */
const InviteAcceptPage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const token = params.token as string;

  // 招待トークンを検証
  const { data: invitation, isLoading: isValidating, error: validationError } = 
    trpc.organizationInvitation.validateToken.useQuery(
      { token },
      {
        enabled: !!token,
        retry: false,
      }
    );

  // 招待受諾
  const acceptInvitationMutation = trpc.organizationInvitation.accept.useMutation({
    onSuccess: (data) => {
      // 成功時は組織ページまたはダッシュボードにリダイレクト
      router.push(`/organizations/${data.organizationId}`);
    },
  });

  const handleAccept = () => {
    if (invitation && session) {
      acceptInvitationMutation.mutate({ token });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // ローディング状態
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">招待を確認しています...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // バリデーションエラー
  if (validationError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/20 rounded-full p-3 w-fit">
              <XCircleIcon className="size-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">招待が無効です</CardTitle>
            <CardDescription>
              {validationError?.message ?? "招待が見つからないか、有効期限が切れています"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push("/")}
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未ログイン状態
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-100 rounded-full p-3 w-fit">
              <MailIcon className="size-6 text-blue-600" />
            </div>
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>
              招待を受諾するには、まずログインしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push("/login")}
            >
              ログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 正常な招待表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/20 rounded-full p-3 w-fit">
            <MailIcon className="size-6 text-primary" />
          </div>
          <CardTitle>組織への招待</CardTitle>
          <CardDescription>
            {invitation.organization.name} からの招待です
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 組織情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-2">
              {invitation.organization.name}
            </h3>
            {invitation.organization.description && (
              <p className="text-muted-foreground text-sm">
                {invitation.organization.description}
              </p>
            )}
          </div>

          {/* 招待詳細 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">招待されたメール:</span>
              <span className="font-medium">{invitation.email}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">権限:</span>
              {invitation.isAdmin ? (
                <Badge variant="destructive">管理者</Badge>
              ) : (
                <Badge variant="secondary">メンバー</Badge>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">招待者:</span>
              <span className="font-medium">{invitation.invitedBy.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">有効期限:</span>
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(invitation.expires)}</span>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={acceptInvitationMutation.isPending}
            >
              {acceptInvitationMutation.isPending ? (
                "参加中..."
              ) : (
                <>
                  <CheckCircleIcon className="size-4 mr-2" />
                  招待を受諾して参加する
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
              disabled={acceptInvitationMutation.isPending}
            >
              キャンセル
            </Button>
          </div>

          {/* エラーメッセージ */}
          {acceptInvitationMutation.error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-destructive text-sm">
                {acceptInvitationMutation.error.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteAcceptPage;