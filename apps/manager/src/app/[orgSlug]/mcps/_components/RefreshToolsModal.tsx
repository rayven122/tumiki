"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import type { McpServerId } from "@/schema/ids";

// ツール変更の型（APIレスポンスと一致）
type ToolChange = {
  type: "added" | "removed" | "modified" | "unchanged";
  name: string;
  description?: string;
  previousDescription?: string;
};

// テンプレートインスタンスごとの変更情報
type TemplateInstanceChanges = {
  templateName: string;
  changes: ToolChange[];
  hasChanges: boolean;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
};

// ツール変更データ
type ToolChangesData = {
  templateInstances: TemplateInstanceChanges[];
  totalAddedCount: number;
  totalRemovedCount: number;
  totalModifiedCount: number;
  hasAnyChanges: boolean;
};

// モーダルのステップ
type ModalStep = "initial" | "preview";

type RefreshToolsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: McpServerId;
  serverName: string;
  onSuccess?: () => Promise<void> | void;
};

// 変更タイプごとのスタイル設定
type ChangeType = ToolChange["type"];

type ChangeTypeConfig = {
  icon: typeof Plus;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
};

const CHANGE_TYPE_CONFIG: Record<ChangeType, ChangeTypeConfig> = {
  added: {
    icon: Plus,
    label: "追加",
    bgClass: "bg-green-50",
    textClass: "text-green-700",
    borderClass: "border-green-200",
    badgeClass: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  removed: {
    icon: Minus,
    label: "削除",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    badgeClass: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  modified: {
    icon: RefreshCw,
    label: "変更",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  unchanged: {
    icon: Check,
    label: "変更なし",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    borderClass: "border-gray-200",
    badgeClass: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  },
} as const;

// 変更タイプのソート順
const CHANGE_TYPE_ORDER: Record<ChangeType, number> = {
  added: 0,
  removed: 1,
  modified: 2,
  unchanged: 3,
};

// ツール変更をソートする関数
const sortToolChanges = (changes: ToolChange[]): ToolChange[] =>
  [...changes].sort(
    (a, b) => CHANGE_TYPE_ORDER[a.type] - CHANGE_TYPE_ORDER[b.type],
  );

// サマリーバッジコンポーネント
type SummaryBadgesProps = {
  data: ToolChangesData;
};

const SummaryBadges = ({ data }: SummaryBadgesProps) => (
  <div className="flex flex-wrap gap-2">
    {data.totalAddedCount > 0 && (
      <Badge className={CHANGE_TYPE_CONFIG.added.badgeClass}>
        <Plus className="mr-1 h-3 w-3" />
        追加: {data.totalAddedCount}
      </Badge>
    )}
    {data.totalRemovedCount > 0 && (
      <Badge className={CHANGE_TYPE_CONFIG.removed.badgeClass}>
        <Minus className="mr-1 h-3 w-3" />
        削除: {data.totalRemovedCount}
      </Badge>
    )}
    {data.totalModifiedCount > 0 && (
      <Badge className={CHANGE_TYPE_CONFIG.modified.badgeClass}>
        <RefreshCw className="mr-1 h-3 w-3" />
        変更: {data.totalModifiedCount}
      </Badge>
    )}
  </div>
);

// ツール変更カードコンポーネント
type ToolChangeCardProps = {
  change: ToolChange;
  index: number;
};

const ToolChangeCard = ({ change, index }: ToolChangeCardProps) => {
  const config = CHANGE_TYPE_CONFIG[change.type];
  const Icon = config.icon;
  const isModified = change.type === "modified";

  return (
    <div
      key={`${change.name}-${index}`}
      className={cn(
        "rounded-md border p-3",
        config.bgClass,
        config.borderClass,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.textClass)} />
        <span className={cn("font-medium", config.textClass)}>
          {change.name}
        </span>
      </div>
      {change.description && !isModified && (
        <p className="mt-1 text-sm text-gray-600">{change.description}</p>
      )}
      {isModified && (
        <div className="mt-2 space-y-1 text-xs">
          {change.previousDescription && (
            <p className="text-gray-500 line-through">
              旧: {change.previousDescription}
            </p>
          )}
          {change.description && (
            <p className="text-gray-700">新: {change.description}</p>
          )}
        </div>
      )}
    </div>
  );
};

// テンプレートインスタンスコンポーネント
type TemplateInstanceSectionProps = {
  instance: TemplateInstanceChanges;
  isOpen: boolean;
  onToggle: () => void;
};

const TemplateInstanceSection = ({
  instance,
  isOpen,
  onToggle,
}: TemplateInstanceSectionProps) => {
  const sortedChanges = sortToolChanges(instance.changes);
  const changesCount =
    instance.addedCount + instance.removedCount + instance.modifiedCount;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md border p-3">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">{instance.templateName}</span>
        </div>
        <span className="text-muted-foreground text-sm">
          {instance.hasChanges
            ? `${changesCount}件の変更`
            : `${instance.unchangedCount}件（変更なし）`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 pl-6">
          {sortedChanges.map((change, idx) => (
            <ToolChangeCard
              key={`${change.name}-${idx}`}
              change={change}
              index={idx}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// テンプレートインスタンス一覧コンポーネント
type TemplateInstancesListProps = {
  instances: TemplateInstanceChanges[];
  openSections: Set<string>;
  onToggleSection: (templateName: string) => void;
};

const TemplateInstancesList = ({
  instances,
  openSections,
  onToggleSection,
}: TemplateInstancesListProps) => (
  <div className="max-h-[50vh] space-y-2 overflow-y-auto">
    {instances.map((instance) => (
      <TemplateInstanceSection
        key={instance.templateName}
        instance={instance}
        isOpen={openSections.has(instance.templateName)}
        onToggle={() => onToggleSection(instance.templateName)}
      />
    ))}
  </div>
);

export const RefreshToolsModal = ({
  open,
  onOpenChange,
  serverId,
  serverName,
  onSuccess,
}: RefreshToolsModalProps) => {
  const [step, setStep] = useState<ModalStep>("initial");
  const [previewData, setPreviewData] = useState<ToolChangesData | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const { mutate: refreshTools, isPending } =
    api.userMcpServer.refreshTools.useMutation({
      onError: (error) => {
        toast.error(`ツール更新に失敗しました: ${error.message}`);
      },
    });

  // プレビュー取得（dryRun: true）
  const handlePreview = () => {
    refreshTools(
      { id: serverId, dryRun: true },
      {
        onSuccess: (data) => {
          setPreviewData(data);
          // 全てのテンプレートを自動展開
          const allTemplates = data.templateInstances.map(
            (t) => t.templateName,
          );
          setOpenSections(new Set(allTemplates));
          setStep("preview");
        },
      },
    );
  };

  // 変更を確定（dryRun: false）
  const handleConfirm = () => {
    refreshTools(
      { id: serverId, dryRun: false },
      {
        onSuccess: (data) => {
          const summary = [
            data.totalAddedCount > 0 && `追加: ${data.totalAddedCount}`,
            data.totalRemovedCount > 0 && `削除: ${data.totalRemovedCount}`,
            data.totalModifiedCount > 0 && `変更: ${data.totalModifiedCount}`,
          ]
            .filter(Boolean)
            .join("、");
          // 先にデータを再取得してからモーダルを閉じる
          void onSuccess?.();
          handleClose();
          toast.success(`ツールを更新しました（${summary}）`);
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    // モーダルを閉じた後に状態をリセット
    setTimeout(() => {
      setStep("initial");
      setPreviewData(null);
      setOpenSections(new Set());
    }, 200);
  };

  const toggleSection = (templateName: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(templateName)) {
        next.delete(templateName);
      } else {
        next.add(templateName);
      }
      return next;
    });
  };

  // 初期確認画面
  if (step === "initial") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              ツールを更新
            </DialogTitle>
            <DialogDescription>
              MCPサーバーからツール定義を再取得します。新しいツールの追加や既存ツールの変更を反映できます。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{serverName}</span>{" "}
              のツール定義を確認しますか？
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={handlePreview} disabled={isPending}>
              {isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  確認中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  差分を確認
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // プレビュー表示画面
  if (step === "preview" && previewData) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              ツール変更の確認
            </DialogTitle>
            <DialogDescription>
              {previewData.hasAnyChanges
                ? "以下の変更が適用されます。確定ボタンを押すと反映されます。"
                : "ツール定義に変更はありません。"}
            </DialogDescription>
          </DialogHeader>

          <SummaryBadges data={previewData} />
          <TemplateInstancesList
            instances={previewData.templateInstances}
            openSections={openSections}
            onToggleSection={toggleSection}
          />

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              キャンセル
            </Button>
            {previewData.hasAnyChanges && (
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    確定する
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // step === "initial" 以外でpreviewDataがない場合のフォールバック
  return null;
};
