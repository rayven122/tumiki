"use client";

import { useState, useMemo } from "react";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Loader2, Layers, CheckCircle2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { TemplateDragDropContainer } from "../IntegrateFromTemplatesModal/TemplateDragDropContainer";
import type {
  McpServerTemplateWithTools,
  SelectableTemplate,
} from "../IntegrateFromTemplatesModal/types";
import { normalizeSlug } from "@tumiki/db/utils/slug";

// テンプレートをSelectableTemplate形式に変換
const convertToSelectableTemplate = (
  template: McpServerTemplateWithTools,
): SelectableTemplate => ({
  id: template.id,
  name: template.name,
  description: template.description ?? "",
  iconPath: template.iconPath,
  toolCount: template.tools.length,
  authType: template.authType,
  envVarKeys: template.envVarKeys,
  url: template.url ?? "",
});

// デフォルト名を生成
const generateDefaultName = (
  selectedTemplates: SelectableTemplate[],
): string => {
  if (selectedTemplates.length === 0) return "Integrated-MCP";
  if (selectedTemplates.length <= 2) {
    return selectedTemplates.map((t) => t.name).join(" - ");
  }
  const firstName = selectedTemplates[0]?.name ?? "";
  return `${firstName} and ${selectedTemplates.length - 1} MCPs`;
};

// 選択状態に応じたメッセージを取得
const getSelectionMessage = (count: number): string => {
  if (count === 0) return "テンプレートを選択してください";
  if (count === 1) return "あと1つ選択で統合可能";
  return `${count}つのテンプレートを統合`;
};

// 名前からslugを生成（日本語などの非ASCII文字はフォールバックでタイムスタンプ生成）
const generateSlugFromName = (name: string): string => {
  const normalized = normalizeSlug(name);
  return normalized || `integrated-${Date.now().toString(36)}`;
};

export const IntegrateMcpTab = () => {
  const [name, setName] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const utils = api.useUtils();

  // テンプレート一覧を取得
  const { data: mcpServerTemplates } = api.mcpServer.findAll.useQuery();

  const createMutation =
    api.userMcpServer.createIntegratedMcpServer.useMutation({
      onSuccess: () => {
        toast.success("統合MCPを作成しました");
        void utils.userMcpServer.findMcpServers.invalidate();
        // 状態をリセット
        setName("");
        setSelectedTemplateIds([]);
      },
      onError: (error) => {
        const message = error.message || "不明なエラーが発生しました";
        toast.error(`作成に失敗しました: ${message}`);
      },
    });

  // STDIOサーバーを除外し、SelectableTemplate形式に変換
  const allTemplates = useMemo(
    () =>
      (mcpServerTemplates ?? [])
        .filter((t) => t.transportType !== "STDIO")
        .map(convertToSelectableTemplate),
    [mcpServerTemplates],
  );

  // 選択済みと未選択を分離
  const { availableTemplates, selectedTemplates } = useMemo(() => {
    const selectedSet = new Set(selectedTemplateIds);
    const selectedMap = new Map<string, SelectableTemplate>();
    const available: SelectableTemplate[] = [];

    for (const template of allTemplates) {
      if (selectedSet.has(template.id)) {
        selectedMap.set(template.id, template);
      } else {
        available.push(template);
      }
    }

    // 選択順序を維持
    const selected = selectedTemplateIds
      .map((id) => selectedMap.get(id))
      .filter((t): t is SelectableTemplate => t !== undefined);

    return { availableTemplates: available, selectedTemplates: selected };
  }, [allTemplates, selectedTemplateIds]);

  const handleSelect = (templateId: string) => {
    setSelectedTemplateIds((prev) => {
      if (prev.includes(templateId)) return prev;
      return [...prev, templateId];
    });
  };

  const handleRemove = (templateId: string) => {
    setSelectedTemplateIds((prev) => prev.filter((id) => id !== templateId));
  };

  const handleCreate = () => {
    if (selectedTemplates.length < 2) {
      toast.error("2つ以上のテンプレートを選択してください");
      return;
    }

    const serverName = name.trim() || generateDefaultName(selectedTemplates);

    // APIリクエスト用のデータを構築
    const templates = selectedTemplates.map((template) => ({
      mcpServerTemplateId: template.id,
      normalizedName: template.name,
    }));

    createMutation.mutate({
      name: serverName,
      slug: generateSlugFromName(serverName),
      templates,
    });
  };

  const canCreate = selectedTemplates.length >= 2;
  const selectionCount = selectedTemplates.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        2つ以上のテンプレートを選択して、1つの統合MCPとして作成
      </p>

      {/* ドラッグ&ドロップエリア */}
      <TemplateDragDropContainer
        availableTemplates={availableTemplates}
        selectedTemplates={selectedTemplates}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />

      {/* 統合アクションエリア - 選択状態に応じて表示 */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        {/* 進捗メッセージ */}
        <div className="mb-4 flex items-center gap-2">
          {canCreate ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-400 text-xs font-bold text-gray-600">
              {selectionCount}
            </div>
          )}
          <span
            className={`text-sm font-medium ${canCreate ? "text-green-700" : "text-gray-700"}`}
          >
            {getSelectionMessage(selectionCount)}
          </span>
        </div>

        {/* 名前入力 - 統合可能になったら表示 */}
        {canCreate && (
          <div className="mb-4 space-y-2">
            <Label htmlFor="template-integrate-name" className="text-gray-700">
              統合MCPの名前（任意）
            </Label>
            <Input
              id="template-integrate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateDefaultName(selectedTemplates)}
              disabled={createMutation.isPending}
              className="bg-white"
            />
            <p className="text-xs text-gray-500">
              空の場合は選択したテンプレート名から自動生成されます
            </p>
          </div>
        )}

        {/* 作成ボタン */}
        <Button
          onClick={handleCreate}
          disabled={!canCreate || createMutation.isPending}
          className="min-h-[44px] w-full"
          size="lg"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              作成中...
            </>
          ) : canCreate ? (
            <>
              <Layers className="mr-2 h-4 w-4" />
              統合MCPを作成
            </>
          ) : (
            "テンプレートを2つ以上選択してください"
          )}
        </Button>
      </div>
    </div>
  );
};
