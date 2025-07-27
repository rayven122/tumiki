"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  Info,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { OAUTH_PROVIDER_CONFIG } from "@tumiki/auth";

// Google用のスコープ設定
const GOOGLE_SCOPES = OAUTH_PROVIDER_CONFIG.google.availableScopes.map(
  (scope) => ({
    ...scope,
    value: scope.scopes.join(" "),
  }),
);

export default function GoogleOAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);

  // URLパラメータから接続成功を確認
  const isJustConnected = searchParams.get("connected") === "true";

  // OAuth接続状態を確認
  const {
    data: connectionStatus,
    isLoading: isCheckingStatus,
    error: connectionError,
  } = api.oauth.getConnectionStatus.useQuery({ provider: "google" });

  // 接続状態の変更を監視
  useEffect(() => {
    if (connectionStatus !== undefined) {
      console.log("🎯 Connection status check result:", connectionStatus);
    }
    if (connectionError) {
      console.error("❌ Connection status check error:", connectionError);
    }
  }, [connectionStatus, connectionError]);

  // OAuth認証開始
  const startOAuthMutation = api.oauth.startOAuthConnection.useMutation({
    onSuccess: (data) => {
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      }
    },
    onError: (error) => {
      setError(error.message);
      setIsConnecting(false);
    },
  });

  // Googleアクセストークン取得
  const {
    data: tokenData,
    refetch: refetchToken,
    isLoading: isLoadingToken,
  } = api.oauth.getGoogleAccessToken.useQuery(undefined, {
    enabled: connectionStatus?.isConnected === true,
    refetchOnWindowFocus: false,
  });

  const handleScopeToggle = (scopeValue: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeValue)
        ? prev.filter((s) => s !== scopeValue)
        : [...prev, scopeValue],
    );
  };

  const handleSelectAll = () => {
    if (selectedScopes.length === GOOGLE_SCOPES.length) {
      setSelectedScopes([]);
    } else {
      setSelectedScopes(GOOGLE_SCOPES.map((scope) => scope.value));
    }
  };

  const handleConnect = () => {
    setIsConnecting(true);
    setError(null);

    startOAuthMutation.mutate({
      provider: "google",
      scopes: selectedScopes,
      returnTo: "/google-oauth?connected=true",
    });
  };

  const handleCopyToken = async () => {
    if (tokenData?.accessToken && typeof tokenData.accessToken === "string") {
      await navigator.clipboard.writeText(tokenData.accessToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleRefreshToken = async () => {
    await refetchToken();
    setTokenRefreshed(true);
    setTimeout(() => setTokenRefreshed(false), 2000);
  };

  if (isCheckingStatus) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex min-h-[600px] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // カテゴリごとにスコープをグループ化
  const scopesByCategory = GOOGLE_SCOPES.reduce<
    Record<string, typeof GOOGLE_SCOPES>
  >(
    (acc, scope) => {
      const category = scope.category ?? "その他";
      acc[category] ??= [];
      acc[category].push(scope);
      return acc;
    },
    {} as Record<string, typeof GOOGLE_SCOPES>,
  );

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Google OAuth認証</h1>
        <p className="text-muted-foreground mt-2">
          Google APIへのアクセス権限を設定し、アクセストークンを取得します
        </p>
      </div>

      {/* 接続成功メッセージ */}
      {isJustConnected && connectionStatus?.isConnected && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">接続成功</AlertTitle>
          <AlertDescription className="text-green-700">
            Googleアカウントとの接続が完了しました。
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-red-500 p-2">
                <span className="text-2xl font-bold text-white">G</span>
              </div>
              <div>
                <CardTitle>Google アカウント連携</CardTitle>
                <CardDescription>APIアクセスのための認証設定</CardDescription>
              </div>
            </div>
            <Badge
              variant={connectionStatus?.isConnected ? "default" : "secondary"}
            >
              {connectionStatus?.isConnected ? "接続済み" : "未接続"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 接続状態とトークン情報 */}
          {connectionStatus?.isConnected && (
            <div className="space-y-4">
              {isLoadingToken ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  <span className="text-muted-foreground ml-2">
                    トークンを取得中...
                  </span>
                </div>
              ) : tokenData?.needsReauth ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {tokenData.message ??
                      "Google認証が必要です。再度ログインしてください。"}
                  </AlertDescription>
                </Alert>
              ) : tokenData?.accessToken ? (
                <>
                  <div className="bg-muted/50 rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium">Googleアクセストークン</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyToken}
                        >
                          {copiedToken ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              コピー
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshToken}
                        >
                          {tokenRefreshed ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              更新済み
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              更新
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <code className="bg-background block rounded p-3 text-xs break-all">
                      {tokenData.accessToken}
                    </code>
                  </div>

                  {/* {tokenData.scope && typeof tokenData.scope === "string" && (
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 text-sm font-medium">
                        許可されたスコープ
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {tokenData.scope.split(" ").map((scope: string) => (
                          <Badge
                            key={scope}
                            variant="secondary"
                            className="text-xs"
                          >
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )} */}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      このトークンを使用してGoogle APIにアクセスできます。
                      トークンは安全に管理してください。
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    アクセストークンが見つかりません。再度ログインしてください。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* スコープ選択 */}
          {!connectionStatus?.isConnected && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">アクセス権限を選択</h3>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedScopes.length === GOOGLE_SCOPES.length
                      ? "すべて解除"
                      : "すべて選択"}
                  </Button>
                </div>

                {Object.entries(scopesByCategory).map(([category, scopes]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-muted-foreground text-sm font-medium">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {scopes.map((scope) => (
                        <div
                          key={scope.id}
                          className={cn(
                            "flex items-start space-x-3 rounded-lg border p-3",
                            "hover:bg-muted/50 cursor-pointer transition-colors",
                            selectedScopes.includes(scope.value) &&
                              "border-primary bg-primary/5",
                          )}
                          onClick={() => handleScopeToggle(scope.value)}
                        >
                          <Checkbox
                            id={scope.id}
                            checked={selectedScopes.includes(scope.value)}
                            onCheckedChange={() =>
                              handleScopeToggle(scope.value)
                            }
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor={scope.id}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{scope.label}</div>
                            <div className="text-muted-foreground text-sm">
                              {scope.description}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || selectedScopes.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      接続中...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Googleアカウントと接続
                    </>
                  )}
                </Button>
                {selectedScopes.length === 0 && (
                  <p className="text-muted-foreground text-center text-sm">
                    少なくとも1つの権限を選択してください
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ナビゲーション */}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => router.push("/mcp")}>
          MCPサーバー一覧
        </Button>
        <Button variant="ghost" onClick={() => router.push("/oauth")}>
          他のOAuth設定
        </Button>
      </div>
    </div>
  );
}
