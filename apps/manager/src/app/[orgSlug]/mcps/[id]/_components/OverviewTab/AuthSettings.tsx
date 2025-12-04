"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertCircle, Info } from "lucide-react";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import { AuthType } from "@tumiki/db/prisma";
import type { UserMcpServerDetail } from "../types";
import type { McpServerId } from "@/schema/ids";
import { AuthTypeSelector } from "./_components/AuthTypeSelector";
import { ApiKeyList } from "./_components/ApiKeyList";

type AuthSettingsProps = {
  server: UserMcpServerDetail;
  serverId: McpServerId;
};

export const AuthSettings = ({ serverId }: AuthSettingsProps) => {
  const [selectedAuthType, setSelectedAuthType] = useState<AuthType>(
    AuthType.API_KEY,
  );

  const utils = api.useUtils();

  // 認証タイプ更新
  const { mutate: updateAuthType, isPending: isUpdatingAuthType } =
    api.v2.mcpServerAuth.updateAuthType.useMutation({
      onSuccess: async () => {
        toast.success("認証タイプを更新しました");
        await utils.v2.userMcpServer.findById.invalidate({ id: serverId });
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  // APIキー発行
  const { mutate: generateApiKey, isPending: isGeneratingApiKey } =
    api.v2.mcpServerAuth.generateApiKey.useMutation({
      onSuccess: async () => {
        toast.success("APIキーを発行しました");
        await utils.v2.userMcpServer.findById.invalidate({ id: serverId });
        await utils.v2.mcpServerAuth.listApiKeys.invalidate({ serverId });
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const handleGenerateApiKey = (expiresAt: Date | undefined) => {
    generateApiKey({ serverId, expiresAt });
  };

  // APIキー一覧取得
  const { data: apiKeys, isLoading: isLoadingApiKeys } =
    api.v2.mcpServerAuth.listApiKeys.useQuery(
      { serverId },
      { enabled: selectedAuthType === AuthType.API_KEY },
    );

  // APIキー削除
  const { mutate: deleteApiKey } =
    api.v2.mcpServerAuth.deleteApiKey.useMutation({
      onSuccess: async () => {
        toast.success("APIキーを削除しました");
        await utils.v2.mcpServerAuth.listApiKeys.invalidate({ serverId });
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  // APIキー有効/無効切り替え
  const { mutate: toggleApiKey } =
    api.v2.mcpServerAuth.toggleApiKey.useMutation({
      onSuccess: async () => {
        toast.success("APIキーの状態を更新しました");
        await utils.v2.mcpServerAuth.listApiKeys.invalidate({ serverId });
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const handleAuthTypeChange = (value: string) => {
    const newAuthType = value as AuthType;
    setSelectedAuthType(newAuthType);
    updateAuthType({ id: serverId, authType: newAuthType });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>認証設定</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 認証タイプ選択 */}
        <AuthTypeSelector
          selectedAuthType={selectedAuthType}
          onAuthTypeChange={handleAuthTypeChange}
          isUpdating={isUpdatingAuthType}
        />

        {/* 認証タイプ別の設定UI */}
        {selectedAuthType === AuthType.API_KEY && (
          <>
            {/* APIキー使用方法の説明 */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start space-x-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-blue-900">
                    APIキーの設定方法
                  </p>
                  <div className="space-y-1 text-xs text-blue-800">
                    <p>
                      発行したAPIキーは、以下のいずれかの方法でHTTPリクエストに含めて使用します：
                    </p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>
                        <span className="font-medium">
                          Tumiki-API-Keyヘッダー:
                        </span>{" "}
                        <code className="rounded bg-blue-100 px-1">
                          Tumiki-API-Key: your_api_key
                        </code>
                      </li>
                      <li>
                        <span className="font-medium">
                          Authorizationヘッダー（ベアラートークン）:
                        </span>{" "}
                        <code className="rounded bg-blue-100 px-1">
                          Authorization: Bearer your_api_key
                        </code>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <ApiKeyList
              apiKeys={apiKeys}
              isLoading={isLoadingApiKeys}
              isGenerating={isGeneratingApiKey}
              onGenerateApiKey={handleGenerateApiKey}
              onToggleApiKey={toggleApiKey}
              onDeleteApiKey={deleteApiKey}
            />
          </>
        )}

        {selectedAuthType === AuthType.OAUTH && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>近日リリース予定</AlertTitle>
            <AlertDescription>
              OAuth認証は近日中にリリース予定です。もうしばらくお待ちください。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
