"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { toast } from "@/utils/client/toast";
import { ApiKeyItem } from "./ApiKeyItem";
import { GenerateApiKeyDialog } from "./GenerateApiKeyDialog";

type ApiKey = {
  id: string;
  name: string;
  apiKey: string | null;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

type ApiKeyListProps = {
  apiKeys: ApiKey[] | undefined;
  isLoading: boolean;
  isGenerating: boolean;
  onGenerateApiKey: (expiresAt: Date | undefined) => void;
  onToggleApiKey: (params: { apiKeyId: string; isActive: boolean }) => void;
  onDeleteApiKey: (params: { apiKeyId: string }) => void;
};

export const ApiKeyList = ({
  apiKeys,
  isLoading,
  isGenerating,
  onGenerateApiKey,
  onToggleApiKey,
  onDeleteApiKey,
}: ApiKeyListProps) => {
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCopyApiKey = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("APIキーをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleGenerateClick = () => {
    setIsDialogOpen(true);
  };

  const handleConfirmGenerate = (expiresAt: Date | undefined) => {
    onGenerateApiKey(expiresAt);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">APIキー一覧</h4>
          <p className="mt-1 text-xs text-gray-500">
            MCPサーバーへのアクセスに使用するAPIキーを管理
          </p>
        </div>
        <Button size="sm" onClick={handleGenerateClick} disabled={isGenerating}>
          <Plus className="mr-2 h-4 w-4" />
          新規発行
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ) : apiKeys && apiKeys.length > 0 ? (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <ApiKeyItem
              key={key.id}
              apiKey={key}
              isVisible={showApiKeys[key.id] ?? false}
              onToggleVisibility={() => toggleApiKeyVisibility(key.id)}
              onCopy={() => handleCopyApiKey(key.apiKey ?? "")}
              onToggleActive={() =>
                onToggleApiKey({
                  apiKeyId: key.id,
                  isActive: !key.isActive,
                })
              }
              onDelete={() => onDeleteApiKey({ apiKeyId: key.id })}
            />
          ))}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>APIキーが未発行です</AlertTitle>
          <AlertDescription>
            「新規発行」ボタンからAPIキーを発行してください。
          </AlertDescription>
        </Alert>
      )}

      <GenerateApiKeyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleConfirmGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
};
