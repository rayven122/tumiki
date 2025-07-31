"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Loader2, Server, Info, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import type { McpServer } from "@tumiki/db/prisma";
import { api } from "@/trpc/react";
import { FaviconImage } from "@/components/ui/FaviconImage";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ApiTokenModalProps = {
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServer;
  userMcpServerId?: string;
  initialEnvVars?: Record<string, string>;
  mode?: "create" | "edit";
};

export const UserMcpServerConfigModal = ({
  onOpenChange,
  mcpServer,
  userMcpServerId,
  initialEnvVars,
  mode = "create",
}: ApiTokenModalProps) => {
  const utils = api.useUtils();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);

  const { mutate: checkServerConnection } =
    api.userMcpServerInstance.checkServerConnection.useMutation({
      onSuccess: async (result) => {
        if (result.success) {
          toast.success(`${mcpServer.name}が正常に接続されました。`);
          await utils.userMcpServerInstance.invalidate();
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(result.error ?? "接続検証に失敗しました");
        }
        setIsValidating(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsValidating(false);
      },
    });

  const { mutate: addOfficialServer, isPending } =
    api.userMcpServerInstance.addOfficialServer.useMutation({
      onSuccess: async (data) => {
        if (!isGitHubMcp || authMethod !== "oauth") {
          // APIキーの場合のみ検証を実行
          setIsValidating(true);
          toast.info("接続を検証しています...");
          checkServerConnection({
            serverInstanceId: data.id,
            updateStatus: true,
          });
        } else {
          // OAuth認証の場合は別のフローで処理される
          toast.success(
            `${mcpServer.name}のAPIトークンが正常に保存されました。`,
          );
          await utils.userMcpServerInstance.invalidate();
          onOpenChange(false);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // OAuth認証専用のミューテーション（onSuccessコールバックなし）
  const { mutateAsync: addOfficialServerForOAuth } =
    api.userMcpServerInstance.addOfficialServer.useMutation({
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: updateServerConfig, isPending: isUpdating } =
    api.userMcpServerConfig.update.useMutation({
      onSuccess: () => {
        toast.success(`${mcpServer.name}のAPIトークンが正常に更新されました。`);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // OAuth認証フロー開始
  const { mutate: startOAuthConnection } =
    api.oauth.startOAuthConnection.useMutation({
      onSuccess: (data) => {
        // OAuth認証画面へリダイレクト
        window.location.href = data.loginUrl;
      },
      onError: (error) => {
        toast.error(`OAuth認証の開始に失敗しました: ${error.message}`);
      },
    });

  // 各環境変数に対応するトークンを保持するステート
  const [envVars, setTokens] = useState<Record<string, string>>(() => {
    // 初期値として既存のトークンがある場合はそれを使用し、ない場合は空文字列を設定
    return mcpServer.envVars.reduce((acc, envVar) => {
      return { ...acc, [envVar]: initialEnvVars?.[envVar] ?? "" };
    }, {});
  });

  // 認証方法の選択状態
  const [authMethod, setAuthMethod] = useState<"oauth" | "apikey">("oauth");

  // OAuth認証処理中のフラグ
  const [isOAuthConnecting, setIsOAuthConnecting] = useState(false);

  // 特定の環境変数のトークン値を更新する関数
  const handleTokenChange = (envVar: string, value: string) => {
    setTokens((prev) => ({
      ...prev,
      [envVar]: value,
    }));
  };

  // すべてのトークンが入力されているかチェック
  const isFormValid = () => {
    return Object.values(envVars).every((token) => token.trim() !== "");
  };

  // トークンを保存する関数
  const handleSave = () => {
    if (isOAuthSupported && authMethod === "oauth") {
      // OAuthの場合は認証フローを開始のみ
      const provider = isGitHubMcp ? "github" : "figma";
      void handleOAuthConnect(provider, []);
    } else {
      // APIキーの場合は既存の処理
      addOfficialServer({
        mcpServerId: mcpServer.id,
        envVars,
      });
    }
  };

  const handleUpdate = () => {
    if (!userMcpServerId) {
      toast.error("ユーザーのMCPサーバーが見つかりません");
      return;
    }

    if (isOAuthSupported && authMethod === "oauth") {
      // OAuth認証の場合は認証フローを開始
      const provider = isGitHubMcp ? "github" : "figma";
      void handleOAuthConnect(provider, []);
    } else {
      // APIキーの場合は既存の処理
      updateServerConfig({
        id: userMcpServerId,
        envVars,
      });
    }
  };

  // OAuth認証を開始
  const handleOAuthConnect = useCallback(
    async (provider: "github" | "figma", scopes?: string[]) => {
      // 既に処理中の場合は何もしない
      if (isOAuthConnecting) {
        console.log("OAuth認証処理中のため、重複実行をスキップ");
        return;
      }

      setIsOAuthConnecting(true);
      const scopesToUse = scopes ?? [];

      try {
        let configId: string;

        if (mode === "create") {
          // OAuth認証の場合、PENDINGステータスで作成
          const result = await addOfficialServerForOAuth({
            mcpServerId: mcpServer.id,
            envVars: {},
            isPending: true, // PENDINGフラグを追加
          });

          configId = result.userMcpServerConfigId;
        } else {
          // 編集モードのOAuth認証は未実装
          throw new Error("編集モードのOAuth認証は現在サポートされていません");
        }

        // OAuth認証を開始
        const scopesParam = scopesToUse.join(",");
        const returnUrl = `/mcp/servers?oauth_callback=${provider}&configId=${configId}&scopes=${scopesParam}`;

        startOAuthConnection({
          provider,
          scopes: scopesToUse,
          returnTo: returnUrl,
        });
      } catch (error) {
        console.error("OAuth認証の開始に失敗:", error);
        toast.error("設定の作成に失敗しました");
        setIsOAuthConnecting(false); // エラー時にフラグをリセット
      }
    },
    [
      isOAuthConnecting,
      mode,
      mcpServer.id,
      addOfficialServerForOAuth,
      startOAuthConnection,
      onOpenChange,
    ],
  );

  // OAuth対応MCPかどうかをチェック
  const isGitHubMcp = mcpServer.name === "GitHub MCP";
  const isFigmaMcp = mcpServer.name === "Figma";
  const isOAuthSupported = isGitHubMcp || isFigmaMcp;

  const isProcessing =
    isPending || isUpdating || isValidating || isOAuthConnecting;

  return (
    <Dialog open onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          {/* ローディングオーバーレイ */}
          {isProcessing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {isPending
                    ? "サーバーを追加中..."
                    : isValidating
                      ? "接続を検証中..."
                      : isOAuthConnecting
                        ? "OAuth接続中..."
                        : "更新中..."}
                </span>
              </div>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              APIトークンの{mode === "create" ? "設定" : "編集"}
            </DialogTitle>
            <DialogDescription>
              {mcpServer.name}
              に接続するために必要なAPIトークンを
              {mode === "create" ? "設定" : "編集"}してください。
            </DialogDescription>
          </DialogHeader>

          {/* サービス情報 */}
          <div className="mb-4 flex items-center">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-md border p-2">
              {mcpServer.iconPath ? (
                <Image
                  src={mcpServer.iconPath}
                  alt={mcpServer.name}
                  width={24}
                  height={24}
                  className="h-6 w-6"
                />
              ) : (
                <FaviconImage
                  url={mcpServer.url}
                  alt={mcpServer.name}
                  size={24}
                  className="h-6 w-6"
                  fallback={<Server className="h-6 w-6 text-gray-500" />}
                />
              )}
            </div>
            <div>
              <h2 className="font-medium">{mcpServer.name}</h2>
              <Badge variant="outline" className="mt-1 text-xs">
                {mcpServer.envVars.length > 1
                  ? `${mcpServer.envVars.length}つのAPIトークンが必要`
                  : "APIトークンが必要"}
              </Badge>
            </div>
          </div>

          {/* OAuth対応MCPの場合はタブで認証方法を選択 */}
          {isOAuthSupported ? (
            <Tabs
              value={authMethod}
              onValueChange={(v) => setAuthMethod(v as "apikey" | "oauth")}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth">OAuth認証</TabsTrigger>
                <TabsTrigger value="apikey">APIキー</TabsTrigger>
              </TabsList>

              <TabsContent value="apikey" className="space-y-4">
                {/* 既存のAPIキー入力フィールド */}
                {mcpServer.envVars.map((envVar, index) => (
                  <div key={envVar} className="space-y-2">
                    <Label htmlFor={`token-${envVar}`} className="text-sm">
                      {envVar}
                    </Label>
                    <Input
                      id={`token-${envVar}`}
                      type="password"
                      placeholder={`${envVar}を入力してください`}
                      value={envVars[envVar]}
                      onChange={(e) =>
                        handleTokenChange(envVar, e.target.value)
                      }
                      className="text-sm"
                      disabled={isProcessing}
                    />
                    {index === mcpServer.envVars.length - 1 && (
                      <p className="text-muted-foreground text-xs">
                        トークンは暗号化されて安全に保存されます
                      </p>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="oauth" className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    OAuth認証を使用すると、{isGitHubMcp ? "GitHub" : "Figma"}
                    アカウントでログインして自動的に必要な権限がすべて付与されます。
                    トークンの有効期限が切れた場合は自動的に更新されます。
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border bg-gray-50 p-4">
                  <h4 className="mb-2 font-medium">自動適用される権限</h4>
                  <p className="text-muted-foreground mb-3 text-sm">
                    OAuth認証では、必要な権限がAuth0側で管理されます。
                    接続ボタンをクリックすると、
                    {isGitHubMcp ? "GitHub" : "Figma"}の認証画面に移動します。
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* 既存のAPIキー入力フィールド（OAuth非対応のMCP） */
            <div className="space-y-4">
              {mcpServer.envVars.map((envVar, index) => (
                <div key={envVar} className="space-y-2">
                  <Label htmlFor={`token-${envVar}`} className="text-sm">
                    {envVar}
                  </Label>
                  <Input
                    id={`token-${envVar}`}
                    type="password"
                    placeholder={`${envVar}を入力してください`}
                    value={envVars[envVar]}
                    onChange={(e) => handleTokenChange(envVar, e.target.value)}
                    className="text-sm"
                    disabled={isProcessing}
                  />
                  {index === mcpServer.envVars.length - 1 && (
                    <p className="text-muted-foreground text-xs">
                      トークンは暗号化されて安全に保存されます
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              disabled={isProcessing}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (mode === "create") {
                  handleSave();
                } else {
                  handleUpdate();
                }
              }}
              disabled={
                isOAuthSupported && authMethod === "oauth"
                  ? isProcessing
                  : !isFormValid() || isProcessing
              }
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending
                    ? "追加中..."
                    : isValidating
                      ? "検証中..."
                      : isOAuthConnecting
                        ? "OAuth接続中..."
                        : "更新中..."}
                </>
              ) : isOAuthSupported && authMethod === "oauth" ? (
                "認証"
              ) : mode === "create" ? (
                "保存"
              ) : (
                "更新"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
