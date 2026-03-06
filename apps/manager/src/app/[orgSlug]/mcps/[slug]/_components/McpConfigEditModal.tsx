"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { Separator } from "@tumiki/ui/separator";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Badge } from "@tumiki/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tumiki/ui/collapsible";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import { cn } from "@/lib/utils";
import type { McpServerId } from "@/schema/ids";
import { McpServerIcon } from "../../_components/McpServerIcon";
import { ServerNameInput } from "../../_components/ServerCard/ServerCardServerNameInput";
import { LoadingOverlay } from "../../_components/ServerCard/ServerCardLoadingOverlay";

/** 編集可能なテンプレートインスタンスの情報 */
type EditableInstance = {
  id: string;
  name: string;
  iconPath?: string | null;
  url?: string | null;
};

type McpConfigEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** MCPサーバーID */
  serverId: McpServerId;
  /** 初期サーバー名 */
  initialServerName: string;
  /** テンプレートインスタンスID（API設定がある場合） - 後方互換性のため維持 */
  templateInstanceId: string | null;
  /** テンプレート名 - 後方互換性のため維持 */
  templateName: string;
  /** 編集可能なテンプレートインスタンス一覧（カスタムMCP用） */
  editableInstances?: EditableInstance[];
  onSuccess?: () => void;
};

/**
 * 環境変数の数に応じたバッジテキストを生成
 */
const getEnvVarBadgeText = (envVarCount: number): string => {
  if (envVarCount === 0) return "設定不要";
  if (envVarCount === 1) return "APIトークンが必要";
  return `${envVarCount}つのAPIトークンが必要`;
};

/**
 * サーバー情報表示コンポーネント（単一インスタンス用）
 */
const ServerInfoDisplay = ({
  instanceId,
  instanceName,
  iconPath,
  url,
}: {
  instanceId: string;
  instanceName: string;
  iconPath?: string | null;
  url?: string | null;
}) => {
  const { data: config, isLoading } = api.userMcpServer.getMcpConfig.useQuery(
    { templateInstanceId: instanceId },
    { enabled: true },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border p-2">
        <McpServerIcon
          iconPath={iconPath}
          fallbackUrl={url}
          alt={instanceName}
          size={24}
        />
      </div>
      <div className="min-w-0">
        <h2 className="font-medium">{instanceName}</h2>
        <Badge variant="outline" className="mt-1 text-xs">
          {getEnvVarBadgeText(config?.envVarKeys.length ?? 0)}
        </Badge>
      </div>
    </div>
  );
};

/**
 * APIキー入力コンポーネント（単一インスタンス用）
 */
const ApiKeyInputs = ({
  instanceId,
  envVars,
  onEnvVarChange,
  isUpdating,
}: {
  instanceId: string;
  envVars: Record<string, string>;
  onEnvVarChange: (instanceId: string, key: string, value: string) => void;
  isUpdating: boolean;
}) => {
  const { data: config, isLoading } = api.userMcpServer.getMcpConfig.useQuery(
    { templateInstanceId: instanceId },
    { enabled: true },
  );

  const hasApiConfig = (config?.envVarKeys.length ?? 0) > 0;

  if (isLoading || !hasApiConfig) {
    return null;
  }

  return (
    <div className="space-y-4">
      {config?.envVarKeys.map((key, index) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`token-${instanceId}-${key}`} className="text-sm">
            {key}
          </Label>
          <Input
            id={`token-${instanceId}-${key}`}
            type="password"
            placeholder={`${key}を入力してください`}
            value={envVars[key] ?? ""}
            onChange={(e) => onEnvVarChange(instanceId, key, e.target.value)}
            className="text-sm"
            disabled={isUpdating}
          />
          {index === (config?.envVarKeys.length ?? 0) - 1 && (
            <p className="text-muted-foreground text-xs">
              トークンは暗号化されて安全に保存されます
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * 複数インスタンス用の設定セクション（Collapsible）
 */
const MultiInstanceConfigSection = ({
  instanceId,
  instanceName,
  iconPath,
  url,
  isOpen,
  onOpenChange,
  envVars,
  onEnvVarChange,
  isUpdating,
}: {
  instanceId: string;
  instanceName: string;
  iconPath?: string | null;
  url?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  envVars: Record<string, string>;
  onEnvVarChange: (instanceId: string, key: string, value: string) => void;
  isUpdating: boolean;
}) => {
  const { data: config, isLoading } = api.userMcpServer.getMcpConfig.useQuery(
    { templateInstanceId: instanceId },
    { enabled: true },
  );

  const hasApiConfig = (config?.envVarKeys.length ?? 0) > 0;
  const isConfigured = Object.values(config?.envVars ?? {}).some(
    (v) => v !== "",
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!hasApiConfig) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border p-3 transition-colors",
            isOpen ? "bg-gray-50" : "hover:bg-gray-50",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border bg-white p-1.5">
              <McpServerIcon
                iconPath={iconPath}
                fallbackUrl={url}
                alt={instanceName}
                size={20}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{instanceName}</span>
              {isConfigured && (
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  <Check className="mr-1 h-3 w-3" />
                  設定済み
                </Badge>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pt-4 pb-2">
        <div className="space-y-4">
          {config?.envVarKeys.map((key, index) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`token-${instanceId}-${key}`} className="text-sm">
                {key}
              </Label>
              <Input
                id={`token-${instanceId}-${key}`}
                type="password"
                placeholder={`${key}を入力してください`}
                value={envVars[key] ?? ""}
                onChange={(e) =>
                  onEnvVarChange(instanceId, key, e.target.value)
                }
                className="text-sm"
                disabled={isUpdating}
              />
              {index === (config?.envVarKeys.length ?? 0) - 1 && (
                <p className="text-muted-foreground text-xs">
                  トークンは暗号化されて安全に保存されます
                </p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * サーバー設定編集モーダル
 *
 * サーバー名とテンプレートインスタンスごとの環境変数を編集します。
 * カスタムMCPサーバーの場合、複数のテンプレートインスタンスを編集できます。
 */
export const McpConfigEditModal = ({
  open,
  onOpenChange,
  serverId,
  initialServerName,
  templateInstanceId,
  templateName,
  editableInstances,
  onSuccess,
}: McpConfigEditModalProps) => {
  const [serverName, setServerName] = useState(initialServerName);
  // インスタンスごとの環境変数: { instanceId: { key: value } }
  const [envVarsMap, setEnvVarsMap] = useState<
    Record<string, Record<string, string>>
  >({});
  // 各セクションの開閉状態
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // 後方互換性: editableInstancesが渡されない場合は単一インスタンスモード
  const instances = useMemo<EditableInstance[]>(() => {
    if (editableInstances) {
      return editableInstances;
    }
    if (templateInstanceId) {
      return [{ id: templateInstanceId, name: templateName }];
    }
    return [];
  }, [editableInstances, templateInstanceId, templateName]);
  const isMultipleInstances = instances.length > 1;

  // 初期値をリセット（モーダルが開くたびに）
  useEffect(() => {
    if (open) {
      setServerName(initialServerName);
      setEnvVarsMap({});
      // 最初のセクションを開く
      const firstInstance = instances[0];
      if (firstInstance) {
        setOpenSections(new Set([firstInstance.id]));
      }
    }
  }, [open, initialServerName, instances]);

  // サーバー名更新ミューテーション
  const { mutateAsync: updateNameAsync, isPending: isUpdatingName } =
    api.userMcpServer.updateName.useMutation();

  // API設定更新ミューテーション
  const { mutateAsync: updateConfigAsync, isPending: isUpdatingConfig } =
    api.userMcpServer.updateMcpConfig.useMutation();

  const isUpdating = isUpdatingName || isUpdatingConfig;

  const handleEnvVarChange = useCallback(
    (instanceId: string, key: string, value: string) => {
      setEnvVarsMap((prev) => ({
        ...prev,
        [instanceId]: {
          ...(prev[instanceId] ?? {}),
          [key]: value,
        },
      }));
    },
    [],
  );

  const handleSectionOpenChange = useCallback(
    (instanceId: string, isOpen: boolean) => {
      setOpenSections((prev) => {
        const next = new Set(prev);
        if (isOpen) {
          next.add(instanceId);
        } else {
          next.delete(instanceId);
        }
        return next;
      });
    },
    [],
  );

  const handleSubmit = async () => {
    const nameChanged = serverName !== initialServerName;

    const promises: Promise<unknown>[] = [];

    // サーバー名を更新
    if (nameChanged) {
      promises.push(updateNameAsync({ id: serverId, name: serverName }));
    }

    // 各インスタンスのAPI設定を更新（空でない値が入力されたもののみ）
    for (const instance of instances) {
      const envVars = envVarsMap[instance.id];
      if (!envVars) continue;

      const hasNewValue = Object.values(envVars).some(
        (value) => value.trim() !== "",
      );
      if (!hasNewValue) continue;

      promises.push(
        updateConfigAsync({ templateInstanceId: instance.id, envVars }),
      );
    }

    // 変更がない場合は何もしない
    if (promises.length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      await Promise.all(promises);
      toast.success("設定を更新しました");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      toast.error(`更新に失敗しました: ${message}`);
    }
  };

  const isServerNameValid = serverName.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={(o) => !isUpdating && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          <LoadingOverlay isProcessing={isUpdating} />

          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold">設定を編集</DialogTitle>
            <DialogDescription>
              サーバー名やAPIトークンの設定を変更できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 単一インスタンスの場合: サーバー情報 → サーバー名 → APIキー入力 */}
            {!isMultipleInstances && instances[0] && (
              <ServerInfoDisplay
                instanceId={instances[0].id}
                instanceName={instances[0].name}
                iconPath={instances[0].iconPath}
                url={instances[0].url}
              />
            )}

            <ServerNameInput
              serverName={serverName}
              placeholder={initialServerName}
              disabled={isUpdating}
              onChange={setServerName}
            />

            {/* 単一インスタンスの場合: APIキー入力 */}
            {!isMultipleInstances && instances[0] && (
              <ApiKeyInputs
                instanceId={instances[0].id}
                envVars={envVarsMap[instances[0].id] ?? {}}
                onEnvVarChange={handleEnvVarChange}
                isUpdating={isUpdating}
              />
            )}

            {/* 複数インスタンスの場合: Collapsibleで各インスタンスを表示 */}
            {isMultipleInstances && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">API設定</Label>
                {instances.map((instance) => (
                  <MultiInstanceConfigSection
                    key={instance.id}
                    instanceId={instance.id}
                    instanceName={instance.name}
                    iconPath={instance.iconPath}
                    url={instance.url}
                    isOpen={openSections.has(instance.id)}
                    onOpenChange={(isOpen) =>
                      handleSectionOpenChange(instance.id, isOpen)
                    }
                    envVars={envVarsMap[instance.id] ?? {}}
                    onEnvVarChange={handleEnvVarChange}
                    isUpdating={isUpdating}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              disabled={isUpdating}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUpdating || !isServerNameValid}
              size="sm"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUpdating ? "更新中..." : "更新"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
