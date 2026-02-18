"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Layers } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  McpDragDropSelector,
  convertToSelectableMcp,
  type UserMcpServer,
  type SelectableMcp,
} from "@/features/mcps/components/mcp-selector";
import { normalizeSlug } from "@tumiki/db/utils/slug";

type IntegrateMcpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userServers: UserMcpServer[];
};

// デフォルト名を生成
const generateDefaultName = (selectedMcps: SelectableMcp[]): string => {
  if (selectedMcps.length === 0) return "Integrated-MCP";
  if (selectedMcps.length <= 2) {
    return selectedMcps.map((mcp) => mcp.name).join(" - ");
  }
  const firstName = selectedMcps[0]?.name ?? "";
  return `${firstName} and ${selectedMcps.length - 1} MCPs`;
};

// 名前からslugを生成（日本語などの非ASCII文字はフォールバックでnanoid生成）
const generateSlugFromName = (name: string): string => {
  const normalized = normalizeSlug(name);
  // 正規化後に空文字になった場合（日本語名など）はタイムスタンプベースのスラグを生成
  return normalized || `integrated-${Date.now().toString(36)}`;
};

export const IntegrateMcpModal = ({
  open,
  onOpenChange,
  userServers,
}: IntegrateMcpModalProps) => {
  const [name, setName] = useState("");
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([]);

  const utils = api.useUtils();

  const createMutation =
    api.userMcpServer.createIntegratedMcpServer.useMutation({
      onSuccess: () => {
        toast.success("統合MCPを作成しました");
        void utils.userMcpServer.findMcpServers.invalidate();
        handleClose();
      },
      onError: (error) => {
        console.error("MCP統合作成エラー:", error);
        const message = error.message || "不明なエラーが発生しました";
        toast.error(`作成に失敗しました: ${message}`);
      },
    });

  // 全MCPをSelectableMcp形式に変換
  const allMcps = useMemo(
    () => userServers.map(convertToSelectableMcp),
    [userServers],
  );

  // 選択済みMCPと未選択MCPを分離
  const { availableMcps, selectedMcps } = useMemo(() => {
    const selectedSet = new Set(selectedMcpIds);
    const selectedMap = new Map(
      allMcps
        .filter((mcp) => selectedSet.has(mcp.id))
        .map((mcp) => [mcp.id, mcp]),
    );
    const available = allMcps.filter((mcp) => !selectedSet.has(mcp.id));
    const selected = selectedMcpIds
      .map((id) => selectedMap.get(id))
      .filter((mcp): mcp is SelectableMcp => mcp !== undefined);

    return { availableMcps: available, selectedMcps: selected };
  }, [allMcps, selectedMcpIds]);

  const handleSelect = useCallback((mcpId: string) => {
    setSelectedMcpIds((prev) => {
      if (prev.includes(mcpId)) return prev;
      return [...prev, mcpId];
    });
  }, []);

  const handleRemove = useCallback((mcpId: string) => {
    setSelectedMcpIds((prev) => prev.filter((id) => id !== mcpId));
  }, []);

  const handleClose = () => {
    setName("");
    setSelectedMcpIds([]);
    onOpenChange(false);
  };

  const handleCreate = () => {
    if (selectedMcps.length < 2) {
      toast.error("2つ以上のMCPを選択してください");
      return;
    }

    const serverName = name.trim() || generateDefaultName(selectedMcps);

    const templates = selectedMcps.flatMap((mcp) =>
      mcp.templateInstances.map((instance) => ({
        mcpServerTemplateId: instance.mcpServerTemplate.id,
        normalizedName:
          instance.normalizedName || instance.mcpServerTemplate.name,
      })),
    );

    createMutation.mutate({
      name: serverName,
      slug: generateSlugFromName(serverName),
      templates,
    });
  };

  const canCreate = selectedMcps.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            MCPを統合
          </DialogTitle>
          <DialogDescription>
            2つ以上のMCPを選択して、1つの統合MCPとして管理できます。
            統合後も各MCPのツールはすべて利用可能です。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 名前入力 */}
          <div className="space-y-2">
            <Label htmlFor="name">名前（任意）</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateDefaultName(selectedMcps)}
              disabled={createMutation.isPending}
            />
            <p className="text-xs text-gray-500">
              空の場合は選択したMCP名から自動生成されます
            </p>
          </div>

          {/* ドラッグ&ドロップエリア */}
          <McpDragDropSelector
            availableMcps={availableMcps}
            selectedMcps={selectedMcps}
            onSelect={handleSelect}
            onRemove={handleRemove}
            availableLabel="利用可能なMCP"
            selectedLabel="統合するMCP"
            selectedCountLabel={`(${selectedMcps.length}/2以上)`}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              "統合する"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
