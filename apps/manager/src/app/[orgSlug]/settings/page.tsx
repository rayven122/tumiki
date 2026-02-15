"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, Info, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { SlackConnectionSection } from "@/features/slack-integration";

const SettingsPage = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // 現在の組織情報を取得
  const { data: organization, isLoading: isLoadingOrg } =
    api.organization.getById.useQuery();

  // ユーザーの組織一覧を取得（削除後のリダイレクト先用）
  const { data: userOrganizations } =
    api.organization.getUserOrganizations.useQuery();

  // 個人組織を取得
  const personalOrg = userOrganizations?.find((org) => org.isPersonal);

  // 組織削除mutation
  const deleteMutation = api.organization.delete.useMutation({
    onSuccess: async () => {
      toast.success("組織を削除しました");
      // セッションを更新
      await update();
      // 個人組織のダッシュボードへリダイレクト
      if (personalOrg) {
        router.push(`/${personalOrg.slug}/mcps`);
      } else {
        router.push("/onboarding");
      }
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error(error.message || "組織の削除に失敗しました");
    },
  });

  // オーナーかどうかを判定（組織の作成者 = オーナー）
  const isOwner = organization?.createdBy === session?.user.id;

  // 削除確認テキストが一致しているか
  const canDelete = confirmText === organization?.name;

  // 削除ハンドラー
  const handleDelete = () => {
    if (!organization?.id || !canDelete) return;
    setIsDeleting(true);
    deleteMutation.mutate({ organizationId: organization.id });
  };

  if (isLoadingOrg) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center py-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 md:px-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground mt-2">組織の設定を管理</p>
      </div>

      {/* Slack連携セクション */}
      <SlackConnectionSection />

      {/* 一般設定セクション（開発中） */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>一般設定</CardTitle>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Info className="h-3 w-3" />
              <span>開発中</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center space-x-2 rounded-lg border border-dashed p-6">
            <Info className="h-5 w-5" />
            <p>
              通知設定や外観設定などの一般設定は現在開発中です。今後のアップデートでご利用いただけます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 危険なゾーンセクション（オーナーのみ表示） */}
      {isOwner && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>危険なゾーン</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-red-300 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-red-800">組織を削除</h4>
                  <p className="text-sm text-red-700">
                    この操作は取り消せません。組織に関連するすべてのデータ（メンバー、MCPサーバー設定、招待など）が完全に削除されます。
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shrink-0"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      組織を削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span>組織を削除しますか？</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-4">
                          <p>
                            <strong className="text-foreground">
                              {organization?.name}
                            </strong>{" "}
                            を削除しようとしています。
                          </p>
                          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                            <ul className="list-inside list-disc space-y-1">
                              <li>すべてのメンバーが組織から削除されます</li>
                              <li>MCPサーバー設定が削除されます</li>
                              <li>保留中の招待がキャンセルされます</li>
                              <li>この操作は取り消せません</li>
                            </ul>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <Label htmlFor="confirm-delete">
                              確認のため、組織名{" "}
                              <strong>{organization?.name}</strong>{" "}
                              を入力してください
                            </Label>
                            <Input
                              id="confirm-delete"
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                              placeholder={organization?.name}
                              className="border-red-300 focus:border-red-400"
                            />
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setConfirmText("")}
                        disabled={isDeleting}
                      >
                        キャンセル
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={!canDelete || isDeleting}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            削除中...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            完全に削除
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* オーナーでない場合のメッセージ */}
      {!isOwner && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="text-muted-foreground flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <p>組織の削除は、組織のオーナーのみが実行できます。</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
