"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, RefreshCw, Shield } from "lucide-react";
import { api } from "@/trpc/react";

type OAuthTokenStatusCardProps = {
  mcpServerTemplateId: string;
  onReauth: () => void;
};

export const OAuthTokenStatusCard = ({
  mcpServerTemplateId,
  onReauth,
}: OAuthTokenStatusCardProps) => {
  const { data: tokenStatus, isLoading } =
    api.v2.userMcpServer.getOAuthTokenStatus.useQuery({
      mcpServerTemplateId,
    });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Shield className="h-5 w-5" />
            <span>OAuth 認証状態</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenStatus?.hasToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Shield className="h-5 w-5" />
            <span>OAuth 認証状態</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>認証が必要です</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                このサーバーを使用するには OAuth 認証が必要です。
              </p>
              <Button onClick={onReauth} size="sm">
                認証する
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // トークン期限切れ
  if (tokenStatus.isExpired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Shield className="h-5 w-5" />
            <span>OAuth 認証状態</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>認証が期限切れです</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                OAuth トークンの有効期限が切れました。再度認証してください。
              </p>
              <Button onClick={onReauth} size="sm" variant="destructive">
                再認証する
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // トークン期限切れ間近（1日以内）
  if (tokenStatus.isExpiringSoon) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Shield className="h-5 w-5" />
            <span>OAuth 認証状態</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>認証の有効期限が近づいています</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                OAuth トークンの有効期限まで残り{" "}
                {tokenStatus.daysRemaining === 0
                  ? "1日未満"
                  : `${tokenStatus.daysRemaining}日`}
                です。
              </p>
              <p className="text-xs text-gray-600">
                有効期限:{" "}
                {tokenStatus.expiresAt
                  ? new Date(tokenStatus.expiresAt).toLocaleString("ja-JP")
                  : "有効期限不明"}
              </p>
              <Button onClick={onReauth} size="sm" variant="outline">
                今すぐ再認証する
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 正常
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <Shield className="h-5 w-5" />
          <span>OAuth 認証状態</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">
              認証済み（有効）
            </p>
            <p className="mt-1 text-xs text-green-700">
              有効期限まで残り {tokenStatus.daysRemaining} 日
            </p>
            <p className="mt-1 text-xs text-green-600">
              有効期限:{" "}
              {tokenStatus.expiresAt
                ? new Date(tokenStatus.expiresAt).toLocaleString("ja-JP")
                : "有効期限不明"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
