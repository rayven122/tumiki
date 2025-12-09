"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Prisma } from "@tumiki/db/prisma";
import { useEditServerForm } from "./_hooks/useEditServerForm";
import { ServerInfoSection } from "./_components/ServerInfoSection";
import { ServerNameInput } from "./_components/ServerNameInput";
import { AuthMethodTabs } from "./_components/AuthMethodTabs";
import { FormActions } from "./_components/FormActions";
import { LoadingOverlay } from "./_components/LoadingOverlay";

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
  const [serverName, setServerName] = useState(mcpServer.name);

  // API呼び出し用のフック
  const { isPending, handleOAuthConnect, handleUpdateWithApiKey } =
    useEditServerForm({
      mcpServer,
      userMcpServerId,
      onSuccess: () => onOpenChange(false),
    });

  // フォームハンドラー
  const handleEnvVarChange = (envVar: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [envVar]: value }));
  };

  const handleSubmit = () => {
    if (mcpServer.authType === "OAUTH") {
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

  return (
    <Dialog open onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          <LoadingOverlay isProcessing={isPending} />

          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold">
              APIトークンの編集
            </DialogTitle>
            <DialogDescription>
              {mcpServer.name}
              に接続するために必要なAPIトークンを編集してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <ServerInfoSection mcpServer={mcpServer} />

            <ServerNameInput
              serverName={serverName}
              placeholder={mcpServer.name}
              disabled={isPending}
              onChange={setServerName}
            />

            {/* 認証方法選択・環境変数入力 */}
            <AuthMethodTabs
              mcpServer={mcpServer}
              envVars={envVars}
              isProcessing={isPending}
              onEnvVarChange={handleEnvVarChange}
            />
          </div>

          <Separator className="my-6" />

          <FormActions
            mode="edit"
            mcpServer={mcpServer}
            isFormValid={isFormValid()}
            isProcessing={isPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
