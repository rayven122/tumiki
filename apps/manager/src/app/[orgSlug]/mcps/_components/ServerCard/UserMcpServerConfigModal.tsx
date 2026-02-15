"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Separator } from "@tumiki/ui/separator";
import type { Prisma } from "@tumiki/db/prisma";
import { useServerConfigForm } from "./hooks/useServerConfigForm";
import { AuthMethodTabs } from "./ServerCardAuthMethodTabs";
import { ServerInfoSection } from "./ServerCardServerInfoSection";
import { FormActions } from "./ServerCardFormActions";
import { LoadingOverlay } from "./ServerCardLoadingOverlay";

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
    isProcessing,
    handleEnvVarChange,
    setServerName,
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
          <LoadingOverlay isProcessing={isProcessing} />

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
            envVars={envVars}
            isProcessing={isProcessing}
            onEnvVarChange={handleEnvVarChange}
          />

          <Separator className="my-4" />

          <FormActions
            mode={mode}
            mcpServer={mcpServer}
            isFormValid={isFormValid()}
            isProcessing={isProcessing}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
