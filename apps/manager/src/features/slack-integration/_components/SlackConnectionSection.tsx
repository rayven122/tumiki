"use client";

/**
 * Slack連携設定セクション
 *
 * 設定ページで使用するSlackワークスペース連携UI
 * OAuth認証を使用してSlackと連携する
 */

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Check, Loader2, Unlink, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

// Slackロゴコンポーネント
const SlackLogo = ({ size = 20 }: { size?: number }) => (
  <Image
    src="/logos/slack.svg"
    alt="Slack"
    width={size}
    height={size}
    className="shrink-0"
  />
);

export const SlackConnectionSection = () => {
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // URLパラメータからSlack連携結果を取得
  const slackConnected = searchParams.get("slack") === "connected";
  const slackError = searchParams.get("slack_error");

  // Slack連携状態を取得
  const { data: connectionStatus, isLoading } =
    api.slackIntegration.getConnectionStatus.useQuery();

  // OAuth URL取得
  const { data: oauthData } = api.slackIntegration.getOAuthUrl.useQuery();

  // Slack連携解除mutation
  const disconnectMutation = api.slackIntegration.disconnect.useMutation({
    onSuccess: async () => {
      toast.success("Slack連携を解除しました");
      await utils.slackIntegration.getConnectionStatus.invalidate();
    },
    onError: (error) => {
      toast.error(`連携解除に失敗しました: ${error.message}`);
    },
  });

  // URLパラメータからの通知を処理
  useEffect(() => {
    if (slackConnected) {
      toast.success("Slackワークスペースと連携しました");
      // URLからパラメータを削除（履歴を汚さない）
      const url = new URL(window.location.href);
      url.searchParams.delete("slack");
      window.history.replaceState({}, "", url.toString());
    }
    if (slackError) {
      toast.error(slackError);
      // URLからパラメータを削除
      const url = new URL(window.location.href);
      url.searchParams.delete("slack_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [slackConnected, slackError]);

  const handleConnect = () => {
    if (oauthData?.url) {
      // OAuth認証ページへリダイレクト
      window.location.href = oauthData.url;
    }
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlackLogo />
            Slack連携
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlackLogo />
          Slack連携
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus?.isConnected ? (
          // 連携済みの場合
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium">連携済み</span>
              </div>
              <p className="text-muted-foreground text-sm">
                ワークスペース: {connectionStatus.teamName}
              </p>
              {connectionStatus.connectedAt && (
                <p className="text-muted-foreground text-xs">
                  {connectionStatus.connectedByName}が
                  {new Date(connectionStatus.connectedAt).toLocaleDateString(
                    "ja-JP",
                  )}
                  に連携
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-red-600 hover:text-red-700"
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  連携解除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Slack連携を解除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    連携を解除すると、エージェント実行時のSlack通知が停止します。
                    エージェントの通知設定は保持されますが、再度連携するまで通知は送信されません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="mr-2 h-4 w-4" />
                    )}
                    連携解除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          // 未連携の場合
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Slackワークスペースと連携すると、エージェント実行完了時に通知を受け取ることができます。
            </p>

            {oauthData?.isConfigured ? (
              // OAuth設定済み - 連携ボタンを表示
              <Button
                variant="outline"
                onClick={handleConnect}
                className="border-gray-300 bg-white hover:bg-gray-50"
              >
                <SlackLogo size={16} />
                <span className="ml-2">Slackと連携</span>
              </Button>
            ) : (
              // OAuth未設定 - 警告メッセージを表示
              <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3 text-amber-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Slack連携が設定されていません
                  </p>
                  <p className="text-xs">
                    管理者に連絡して、Slack App の設定を依頼してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
