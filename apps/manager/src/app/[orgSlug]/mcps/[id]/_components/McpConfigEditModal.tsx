"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FaviconImage } from "@/components/ui/FaviconImage";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, RefreshCw, Server, ChevronDown, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { cn } from "@/lib/utils";
import type { McpServerId } from "@/schema/ids";
import { McpServerIcon } from "../../../_components/McpServerIcon";

/** マスクされた値を表す定数 */
const MASK_VALUE = "•••••";

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
 * 単一テンプレートインスタンスの設定セクション
 */
const TemplateConfigSection = ({
  instanceId,
  instanceName,
  iconPath,
  url,
  isOpen,
  onOpenChange,
  envVars,
  onEnvVarChange,
  isUpdating,
  isMultiple,
  resetKey,
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
  isMultiple: boolean;
  /** モーダルが開くたびにインクリメントされるキー（初期化リセット用） */
  resetKey: number;
}) => {
  const { data: config, isLoading } =
    api.v2.userMcpServer.getMcpConfig.useQuery(
      { templateInstanceId: instanceId },
      { enabled: true },
    );

  // 初期化済みフラグをrefで管理（再レンダリングを防止）
  const initializedRef = useRef(false);

  // resetKeyが変更されたら初期化フラグをリセット
  useEffect(() => {
    initializedRef.current = false;
  }, [resetKey]);

  // configが読み込まれたらenvVarsを初期化（一度だけ実行）
  useEffect(() => {
    if (config && !initializedRef.current) {
      initializedRef.current = true;
      for (const key of config.envVarKeys) {
        if (config.envVars[key]) {
          onEnvVarChange(instanceId, key, config.envVars[key]);
        }
      }
    }
  }, [config, instanceId, onEnvVarChange]);

  const hasApiConfig = (config?.envVarKeys.length ?? 0) > 0;
  const isConfigured = Object.values(config?.envVars ?? {}).some(
    (v) => v === MASK_VALUE,
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

  const content = (
    <div className="space-y-4">
      {config?.envVarKeys.map((key, index) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`token-${instanceId}-${key}`} className="text-sm">
            {key}
          </Label>
          <Input
            id={`token-${instanceId}-${key}`}
            type="password"
            placeholder={
              envVars[key] === MASK_VALUE
                ? "変更する場合は新しい値を入力"
                : `${key}を入力してください`
            }
            value={envVars[key] ?? ""}
            onChange={(e) => onEnvVarChange(instanceId, key, e.target.value)}
            className="text-sm"
            disabled={isUpdating}
          />
          {envVars[key] === MASK_VALUE && (
            <p className="text-muted-foreground text-xs">
              設定済み。変更しない場合はそのままにしてください。
            </p>
          )}
          {index === (config?.envVarKeys.length ?? 0) - 1 &&
            envVars[key] !== MASK_VALUE && (
              <p className="text-muted-foreground text-xs">
                トークンは暗号化されて安全に保存されます
              </p>
            )}
        </div>
      ))}
    </div>
  );

  // 複数インスタンスの場合はCollapsibleで表示
  if (isMultiple) {
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
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // 単一インスタンスの場合はそのまま表示
  return (
    <>
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
      {content}
    </>
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
  // 初期化リセット用のキー（モーダルが開くたびにインクリメント）
  const [resetKey, setResetKey] = useState(0);

  // 後方互換性: editableInstancesが渡されない場合は単一インスタンスモード
  const instances: EditableInstance[] = editableInstances ?? [
    ...(templateInstanceId
      ? [{ id: templateInstanceId, name: templateName }]
      : []),
  ];
  const isMultipleInstances = instances.length > 1;

  // 初期値をリセット（モーダルが開くたびに）
  useEffect(() => {
    if (open) {
      setServerName(initialServerName);
      setEnvVarsMap({});
      setResetKey((prev) => prev + 1);
      // 最初のセクションを開く
      const firstInstance = instances[0];
      if (firstInstance) {
        setOpenSections(new Set([firstInstance.id]));
      }
    }
  }, [open, initialServerName, instances]);

  // サーバー名更新ミューテーション
  const { mutateAsync: updateNameAsync, isPending: isUpdatingName } =
    api.v2.userMcpServer.updateName.useMutation();

  // API設定更新ミューテーション
  const { mutateAsync: updateConfigAsync, isPending: isUpdatingConfig } =
    api.v2.userMcpServer.updateMcpConfig.useMutation();

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

    // 変更のあるインスタンスを収集
    const changedInstances = instances.filter((instance) => {
      const envVars = envVarsMap[instance.id];
      if (!envVars) return false;
      return Object.values(envVars).some(
        (value) => value.trim() !== "" && value !== MASK_VALUE,
      );
    });

    const promises: Promise<unknown>[] = [];

    // サーバー名を更新
    if (nameChanged) {
      promises.push(updateNameAsync({ id: serverId, name: serverName }));
    }

    // 各インスタンスのAPI設定を更新
    for (const instance of changedInstances) {
      const envVars = envVarsMap[instance.id];
      if (!envVars) continue;

      // マスク値のみの場合はスキップ
      const hasNewValue = Object.values(envVars).some(
        (value) => value.trim() !== "" && value !== MASK_VALUE,
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

  // フォームバリデーション
  const isServerNameValid = serverName.trim() !== "";
  const isFormValid = isServerNameValid;

  return (
    <Dialog open={open} onOpenChange={(o) => !isUpdating && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          {/* ローディングオーバーレイ */}
          {isUpdating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  処理中...
                </span>
              </div>
            </div>
          )}

          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold">設定を編集</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* サーバー名入力 */}
            <div className="space-y-2">
              <Label htmlFor="server-name" className="text-sm font-medium">
                サーバー名
              </Label>
              <Input
                id="server-name"
                type="text"
                placeholder="サーバー名を入力"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="text-sm"
                disabled={isUpdating}
              />
            </div>

            {/* API設定セクション */}
            {instances.length > 0 && (
              <div className="space-y-3">
                {isMultipleInstances && (
                  <Label className="text-sm font-medium">API設定</Label>
                )}
                {instances.map((instance) => (
                  <TemplateConfigSection
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
                    isMultiple={isMultipleInstances}
                    resetKey={resetKey}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* アクションボタン */}
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
              disabled={isUpdating || !isFormValid}
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
