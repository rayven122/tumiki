"use client";

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
import { useServerConfigForm } from "./hooks/useServerConfigForm";
import { AuthMethodTabs } from "./components/AuthMethodTabs";
import { ServerInfoSection } from "./components/ServerInfoSection";
import { FormActions } from "./components/FormActions";
import { LoadingOverlay } from "./components/LoadingOverlay";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type ApiTokenModalProps = {
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServerTemplate;
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
  const {
    envVars,
    serverName,
    authMethod,
    isProcessing,
    isValidating,
    isOAuthConnecting,
    isAdding,
    handleEnvVarChange,
    setServerName,
    setAuthMethod,
    handleSubmit,
    isFormValid,
  } = useServerConfigForm({
    mcpServer,
    userMcpServerId,
    initialEnvVars,
    mode,
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Dialog open onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          <LoadingOverlay
            isProcessing={isProcessing}
            isAdding={isAdding}
            isValidating={isValidating}
            isOAuthConnecting={isOAuthConnecting}
          />

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
            mode={mode}
            mcpServer={mcpServer}
            authMethod={authMethod}
            isFormValid={isFormValid()}
            isProcessing={isProcessing}
            isAdding={isAdding}
            isValidating={isValidating}
            isOAuthConnecting={isOAuthConnecting}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
