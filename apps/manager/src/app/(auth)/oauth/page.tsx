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
import { api } from "@/trpc/react";
import { OAUTH_PROVIDERS } from "@tumiki/auth/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const getProviderIcon = (provider: OAuthProvider) => {
  const logoPath = `/logos/${provider}.svg`;

  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white p-2 shadow-sm">
      <Image
        src={logoPath}
        alt={`${provider} logo`}
        width={32}
        height={32}
        className="h-full w-full object-contain"
        onError={(e) => {
          // フォールバック: 画像が読み込めない場合はプロバイダー名の頭文字を表示
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const fallback =
            target.parentElement?.querySelector(".fallback-text");
          if (fallback) {
            fallback.classList.remove("hidden");
          }
        }}
      />
      <span className="fallback-text absolute inset-0 hidden items-center justify-center text-lg font-bold text-gray-600">
        {provider.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

const getProviderDisplayName = (provider: OAuthProvider) => {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    case "slack":
      return "Slack";
    case "discord":
      return "Discord";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
};

export default function OAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProvider, setSelectedProvider] =
    useState<OAuthProvider>("google");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);

  // URLパラメータから接続成功とプロバイダーを確認
  const isJustConnected = searchParams.get("connected") === "true";
  const providerFromUrl = searchParams.get("provider") as OAuthProvider | null;

  // URLパラメータからプロバイダーが指定されている場合は設定
  useEffect(() => {
    if (providerFromUrl && OAUTH_PROVIDERS.includes(providerFromUrl)) {
      setSelectedProvider(providerFromUrl);
    }
  }, [providerFromUrl]);

  // OAuth接続状態を確認
  const {
    data: connectionStatus,
    isLoading: isCheckingStatus,
    error: connectionError,
  } = api.oauth.getConnectionStatus.useQuery({ provider: selectedProvider });

  // 接続状態の変更を監視
  useEffect(() => {
    if (connectionStatus !== undefined) {
      console.log(
        `🎯 ${selectedProvider} connection status:`,
        connectionStatus,
      );
    }
    if (connectionError) {
      console.error(
        `❌ ${selectedProvider} connection error:`,
        connectionError,
      );
    }
  }, [connectionStatus, connectionError, selectedProvider]);

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

  // アクセストークン取得
  const {
    data: tokenData,
    refetch: refetchToken,
    isLoading: isLoadingToken,
  } = api.oauth.getProviderAccessToken.useQuery(
    { provider: selectedProvider },
    {
      enabled: connectionStatus?.isConnected === true,
      refetchOnWindowFocus: false,
    },
  );

  const handleConnect = () => {
    setIsConnecting(true);
    setError(null);

    startOAuthMutation.mutate({
      provider: selectedProvider,
      scopes: [], // Auth0側で管理されるスコープを使用
      returnTo: `/oauth?connected=true&provider=${selectedProvider}`,
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

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">OAuth認証</h1>
        <p className="text-muted-foreground mt-2">
          各種サービスのAPIへのアクセス権限を設定し、アクセストークンを取得します
        </p>
      </div>

      {/* プロバイダー選択 */}
      <div className="mb-6">
        <Label htmlFor="provider-select" className="mb-2 block">
          プロバイダーを選択
        </Label>
        <Select
          value={selectedProvider}
          onValueChange={(value) => {
            const newProvider = value as OAuthProvider;
            setSelectedProvider(newProvider);
            setError(null);

            // URLのクエリパラメータを更新
            const newSearchParams = new URLSearchParams(
              searchParams.toString(),
            );
            newSearchParams.set("provider", newProvider);
            router.replace(`/oauth?${newSearchParams.toString()}`, {
              scroll: false,
            });
          }}
        >
          <SelectTrigger id="provider-select" className="w-full">
            <SelectValue placeholder="プロバイダーを選択" />
          </SelectTrigger>
          <SelectContent>
            {OAUTH_PROVIDERS.map((provider) => (
              <SelectItem key={provider} value={provider}>
                <div className="flex items-center gap-3">
                  <div className="relative h-6 w-6 overflow-hidden rounded bg-white shadow-sm">
                    <Image
                      src={`/logos/${provider}.svg`}
                      alt={`${provider} logo`}
                      width={24}
                      height={24}
                      className="h-full w-full object-contain p-0.5"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                  <span>{getProviderDisplayName(provider)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 接続成功メッセージ */}
      {isJustConnected && connectionStatus?.isConnected && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">接続成功</AlertTitle>
          <AlertDescription className="text-green-700">
            {getProviderDisplayName(selectedProvider)}
            アカウントとの接続が完了しました。
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getProviderIcon(selectedProvider)}
              <div>
                <CardTitle>
                  {getProviderDisplayName(selectedProvider)} アカウント連携
                </CardTitle>
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
                      `${getProviderDisplayName(selectedProvider)}認証が必要です。再度ログインしてください。`}
                  </AlertDescription>
                </Alert>
              ) : tokenData?.accessToken ? (
                <>
                  <div className="bg-muted/50 rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium">
                        {getProviderDisplayName(selectedProvider)}
                        アクセストークン
                      </h3>
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

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      このトークンを使用して
                      {getProviderDisplayName(selectedProvider)}{" "}
                      APIにアクセスできます。 トークンは安全に管理してください。
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

          {/* 接続ボタン */}
          {!connectionStatus?.isConnected && (
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
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
                    {getProviderDisplayName(selectedProvider)}アカウントと接続
                  </>
                )}
              </Button>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  接続時に必要な権限はAuth0側で管理されています。
                  接続ボタンをクリックすると、
                  {getProviderDisplayName(selectedProvider)}
                  の認証画面に移動します。
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ナビゲーション */}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => router.push("/mcp")}>
          MCPサーバー一覧
        </Button>
        <Button variant="ghost" onClick={() => router.push("/settings")}>
          設定
        </Button>
      </div>
    </div>
  );
}
