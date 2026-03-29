import { useState, useMemo, useCallback } from "react";
import {
  Layers,
  Package,
  Wrench,
  X,
  Plus,
  CheckCircle2,
  Server,
} from "lucide-react";
import { MCP_CATALOG_ITEMS } from "../constants/mcpCatalog";
import type { McpCatalogItem } from "../constants/mcpCatalog";
import { clsx } from "clsx";

type SelectableTemplate = {
  id: string;
  name: string;
  description: string;
  authType: McpCatalogItem["authType"];
};

// テンプレートカード
const TemplateCard = ({
  template,
  isSelected,
  onToggle,
}: {
  template: SelectableTemplate;
  isSelected: boolean;
  onToggle: () => void;
}): React.ReactElement => {
  return (
    <div
      className={clsx(
        "group relative flex items-center gap-3 rounded-lg border bg-white p-3 transition-shadow select-none",
        isSelected
          ? "border-purple-300 bg-purple-50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
        <Server className="h-4 w-4 text-gray-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-gray-900">{template.name}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              template.authType === "API_KEY"
                ? "bg-blue-100 text-blue-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {template.authType === "API_KEY" ? "API Key" : "設定不要"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Wrench className="h-3 w-3" />
          <span>認証後に表示</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={clsx(
          "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
          isSelected
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600",
        )}
        aria-label={isSelected ? "削除" : "追加"}
      >
        {isSelected ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
};

// 選択状態に応じたメッセージ
const getSelectionMessage = (count: number): string => {
  if (count === 0) return "テンプレートを選択してください";
  if (count === 1) return "あと1つ選択で統合可能";
  return `${count}つのテンプレートを統合`;
};

// デフォルト名を生成
const generateDefaultName = (templates: SelectableTemplate[]): string => {
  if (templates.length === 0) return "Integrated-MCP";
  if (templates.length <= 2) {
    return templates.map((t) => t.name).join(" - ");
  }
  const firstName = templates[0]?.name ?? "";
  return `${firstName} and ${templates.length - 1} MCPs`;
};

export const IntegrateMcpTab = (): React.ReactElement => {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allTemplates: SelectableTemplate[] = useMemo(
    () =>
      MCP_CATALOG_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        authType: item.authType,
      })),
    [],
  );

  const { availableTemplates, selectedTemplates } = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const selectedMap = new Map<string, SelectableTemplate>();
    const available: SelectableTemplate[] = [];

    for (const template of allTemplates) {
      if (selectedSet.has(template.id)) {
        selectedMap.set(template.id, template);
      } else {
        available.push(template);
      }
    }

    const selected = selectedIds
      .map((id) => selectedMap.get(id))
      .filter((t): t is SelectableTemplate => t !== undefined);

    return { availableTemplates: available, selectedTemplates: selected };
  }, [allTemplates, selectedIds]);

  const handleSelect = useCallback((templateId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(templateId)) return prev;
      return [...prev, templateId];
    });
  }, []);

  const handleRemove = useCallback((templateId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== templateId));
  }, []);

  const canCreate = selectedTemplates.length >= 2;
  const selectionCount = selectedTemplates.length;

  const handleCreate = (): void => {
    // TODO: 統合MCP作成処理
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        2つ以上のテンプレートを選択して、1つの統合MCPとして作成
      </p>

      {/* ドラッグ&ドロップエリア */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 利用可能なテンプレート */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">
              利用可能なテンプレート
            </h3>
            <span className="text-xs text-gray-400">
              ({availableTemplates.length})
            </span>
          </div>
          <div className="flex max-h-[50vh] min-h-[300px] flex-col gap-2 overflow-y-auto rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-3">
            {availableTemplates.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                すべてのテンプレートが選択されています
              </div>
            ) : (
              availableTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={false}
                  onToggle={() => handleSelect(template.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* 統合するテンプレート */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-700">
              統合するテンプレート
            </h3>
            <span className="text-xs text-gray-400">
              ({selectedTemplates.length}/2以上)
            </span>
          </div>
          <div className="flex max-h-[50vh] min-h-[300px] flex-col gap-2 overflow-y-auto rounded-lg border-2 border-dashed border-purple-200 bg-purple-50/50 p-3">
            {selectedTemplates.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-400">
                <Layers className="h-8 w-8 text-purple-300" />
                <span>クリックで追加</span>
              </div>
            ) : (
              selectedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={true}
                  onToggle={() => handleRemove(template.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 統合アクションエリア */}
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

        {/* 名前入力 */}
        {canCreate && (
          <div className="mb-4 space-y-2">
            <label
              htmlFor="integrate-name"
              className="text-sm font-medium text-gray-700"
            >
              統合MCPの名前（任意）
            </label>
            <input
              id="integrate-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateDefaultName(selectedTemplates)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500">
              空の場合は選択したテンプレート名から自動生成されます
            </p>
          </div>
        )}

        {/* 作成ボタン */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className={clsx(
            "w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors",
            canCreate
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          {canCreate ? (
            <span className="flex items-center justify-center gap-2">
              <Layers className="h-4 w-4" />
              統合MCPを作成
            </span>
          ) : (
            "テンプレートを2つ以上選択してください"
          )}
        </button>
      </div>
    </div>
  );
};
