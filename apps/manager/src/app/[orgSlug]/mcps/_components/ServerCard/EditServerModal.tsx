"use client";

import { useState } from "react";
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
import type { Prisma } from "@tumiki/db/prisma";
import { useEditServerForm } from "./hooks/useEditServerForm";
import { ServerInfoSection } from "./components/ServerInfoSection";
import { AuthMethodTabs } from "./components/AuthMethodTabs";
import { FormActions } from "./components/FormActions";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { normalizeServerName } from "@/utils/url";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type EditServerModalProps = {
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServerTemplate;
  userMcpServerId: string;
  initialEnvVars: Record<string, string>;
};

export const EditServerModal = ({
  onOpenChange,
  mcpServer,
  userMcpServerId,
  initialEnvVars,
}: EditServerModalProps) => {
  // フォーム状態
  const [envVars, setEnvVars] =
    useState<Record<string, string>>(initialEnvVars);
  const [serverName, setServerName] = useState(
    normalizeServerName(mcpServer.name),
  );
  const [authMethod, setAuthMethod] = useState<"oauth" | "apikey">("apikey");

  // API呼び出し用のフック
  const {
    isOAuthConnecting,
    isUpdating,
    handleOAuthConnect,
    handleUpdateWithApiKey,
  } = useEditServerForm({
    mcpServer,
    userMcpServerId,
    onSuccess: () => onOpenChange(false),
  });

  // フォームハンドラー
  const handleEnvVarChange = (envVar: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [envVar]: value }));
  };

  const handleSubmit = () => {
    const isOAuthSupported = mcpServer.authType === "OAUTH";
    if (isOAuthSupported && authMethod === "oauth") {
      void handleOAuthConnect(serverName);
    } else {
      handleUpdateWithApiKey(envVars);
    }
  };

  // バリデーション
  const isFormValid = () => {
    if (!serverName.trim()) return false;
    if (mcpServer.envVarKeys.length === 0) return true;
    return Object.values(envVars).some((token) => token.trim() !== "");
  };

  const isProcessing = isUpdating || isOAuthConnecting;

  return (
    <Dialog open onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          <LoadingOverlay
            isProcessing={isProcessing}
            isAdding={false}
            isValidating={false}
            isOAuthConnecting={isOAuthConnecting}
          />

          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              APIトークンの編集
            </DialogTitle>
            <DialogDescription>
              {mcpServer.name}
              に接続するために必要なAPIトークンを編集してください。
            </DialogDescription>
          </DialogHeader>

          <ServerInfoSection mcpServer={mcpServer} />

          {/* サーバー名入力フィールド */}
          <div className="space-y-2">
            <Label htmlFor="server-name" className="text-sm font-medium">
              サーバー名
            </Label>
            <Input
              id="server-name"
              type="text"
              placeholder={mcpServer.name}
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="text-sm"
              disabled={isProcessing}
            />
            <p className="text-muted-foreground text-xs">
              表示されるサーバー名を設定できます
            </p>
          </div>

          {/* 認証方法選択・環境変数入力 */}
          <AuthMethodTabs
            mcpServer={mcpServer}
            authMethod={authMethod}
            envVars={envVars}
            isProcessing={isProcessing}
            onAuthMethodChange={setAuthMethod}
            onEnvVarChange={handleEnvVarChange}
          />

          <Separator className="my-4" />

          <FormActions
            mode="edit"
            mcpServer={mcpServer}
            authMethod={authMethod}
            isFormValid={isFormValid()}
            isProcessing={isProcessing}
            isAdding={false}
            isValidating={false}
            isOAuthConnecting={isOAuthConnecting}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
