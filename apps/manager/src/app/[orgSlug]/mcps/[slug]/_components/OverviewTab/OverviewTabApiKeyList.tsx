"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { toast } from "@/lib/client/toast";
import { ApiKeyItem } from "./OverviewTabApiKeyItem";
import { GenerateApiKeyDialog } from "./OverviewTabGenerateApiKeyDialog";
import { DeactivateApiKeyDialog } from "./OverviewTabDeactivateApiKeyDialog";
import { DeleteApiKeyDialog } from "./OverviewTabDeleteApiKeyDialog";

type ApiKey = {
  id: string;
  name: string;
  apiKey: string | null;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isOwner: boolean;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
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
  const [deactivateDialogState, setDeactivateDialogState] = useState<{
    open: boolean;
    apiKeyId: string | null;
    apiKeyName: string;
  }>({
    open: false,
    apiKeyId: null,
    apiKeyName: "",
  });
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    apiKeyId: string | null;
    apiKeyName: string;
    isActive: boolean;
  }>({
    open: false,
    apiKeyId: null,
    apiKeyName: "",
    isActive: false,
  });

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

  const handleDeactivateClick = (apiKeyId: string, apiKeyName: string) => {
    setDeactivateDialogState({
      open: true,
      apiKeyId,
      apiKeyName,
    });
  };

  const handleConfirmDeactivate = () => {
    if (deactivateDialogState.apiKeyId) {
      onToggleApiKey({
        apiKeyId: deactivateDialogState.apiKeyId,
        isActive: false,
      });
      setDeactivateDialogState({
        open: false,
        apiKeyId: null,
        apiKeyName: "",
      });
    }
  };

  const handleDeleteClick = (
    apiKeyId: string,
    apiKeyName: string,
    isActive: boolean,
  ) => {
    setDeleteDialogState({
      open: true,
      apiKeyId,
      apiKeyName,
      isActive,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteDialogState.apiKeyId) {
      onDeleteApiKey({ apiKeyId: deleteDialogState.apiKeyId });
      setDeleteDialogState({
        open: false,
        apiKeyId: null,
        apiKeyName: "",
        isActive: false,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">APIキー一覧</h4>
          <p className="mt-1 text-xs text-gray-500">
            APIキーの有効期限と残り日数を確認できます
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
              onCopy={() =>
                key.isOwner && key.apiKey && handleCopyApiKey(key.apiKey)
              }
              onDeactivate={() => handleDeactivateClick(key.id, key.name)}
              onDelete={() => handleDeleteClick(key.id, key.name, key.isActive)}
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

      <DeactivateApiKeyDialog
        open={deactivateDialogState.open}
        onOpenChange={(open) =>
          setDeactivateDialogState((prev) => ({ ...prev, open }))
        }
        onConfirm={handleConfirmDeactivate}
        apiKeyName={deactivateDialogState.apiKeyName}
        isDeactivating={false}
      />

      <DeleteApiKeyDialog
        open={deleteDialogState.open}
        onOpenChange={(open) =>
          setDeleteDialogState((prev) => ({ ...prev, open }))
        }
        onConfirm={handleConfirmDelete}
        apiKeyName={deleteDialogState.apiKeyName}
        isActive={deleteDialogState.isActive}
        isDeleting={false}
      />
    </div>
  );
};
