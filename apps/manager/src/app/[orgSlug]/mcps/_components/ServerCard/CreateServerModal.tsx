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
import { normalizeSlug } from "@tumiki/db/utils/slug";
import { useCreateServerForm } from "./hooks/useCreateServerForm";
import { ServerInfoSection } from "./ServerCardServerInfoSection";
import { ServerNameInput } from "./ServerCardServerNameInput";
import { AuthMethodTabs } from "./ServerCardAuthMethodTabs";
import { FormActions } from "./ServerCardFormActions";
import { LoadingOverlay } from "./ServerCardLoadingOverlay";

// 名前からslugを生成（日本語などの非ASCII文字はフォールバックでタイムスタンプ生成）
const generateSlugFromName = (name: string): string => {
  const normalized = normalizeSlug(name);
  return normalized || `mcp-${Date.now().toString(36)}`;
};

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type CreateServerModalProps = {
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServerTemplate;
};

export const CreateServerModal = ({
  onOpenChange,
  mcpServer,
}: CreateServerModalProps) => {
  // フォーム状態
  const [envVars, setEnvVars] = useState<Record<string, string>>(() =>
    mcpServer.envVarKeys.reduce(
      (acc, envVar) => ({ ...acc, [envVar]: "" }),
      {},
    ),
  );
  const [serverName, setServerName] = useState(mcpServer.name);

  // API呼び出し用のフック
  const { isPending, handleOAuthConnect, handleAddWithApiKey } =
    useCreateServerForm({
      onSuccess: () => onOpenChange(false),
    });

  // フォームハンドラー
  const handleEnvVarChange = (envVar: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [envVar]: value }));
  };

  const handleSubmit = () => {
    const slug = generateSlugFromName(serverName);
    if (mcpServer.authType === "OAUTH") {
      handleOAuthConnect({
        serverName,
        slug,
        mcpServerTemplateId: mcpServer.id,
      });
    } else {
      handleAddWithApiKey({
        serverName,
        slug,
        authType: mcpServer.authType,
        mcpServerTemplateId: mcpServer.id,
        envVars,
      });
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
              APIトークンの設定
            </DialogTitle>
            <DialogDescription>
              {mcpServer.name}
              に接続するために必要なAPIトークンを設定してください。
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
            mode="create"
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
