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
import { DragDropContainer } from "./DragDropContainer";
import type { SelectableMcp, UserMcpServer } from "./types";

type IntegrateMcpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userServers: UserMcpServer[];
};

// ユーザーサーバーをSelectableMcp形式に変換
const convertToSelectableMcp = (server: UserMcpServer): SelectableMcp => {
  // 全templateInstancesのツール数を合計
  const toolCount = server.templateInstances.reduce(
    (sum, instance) => sum + instance.tools.length,
    0,
  );

  // アイコンパス: server.iconPath がなければテンプレートのアイコンを使用
  const iconPath =
    server.iconPath ??
    server.templateInstances[0]?.mcpServerTemplate.iconPath ??
    null;

  return {
    id: server.id,
    name: server.name,
    description: server.description ?? "",
    iconPath,
    toolCount,
    templateInstances: server.templateInstances,
  };
};

// デフォルト名を生成（nameValidationSchemaに準拠: 英数字、空白、ハイフン、アンダースコア、ドットのみ）
const generateDefaultName = (selectedMcps: SelectableMcp[]): string => {
  if (selectedMcps.length === 0) return "Integrated-MCP";
  if (selectedMcps.length <= 2) {
    return selectedMcps.map((mcp) => mcp.name).join(" - ");
  }
  const firstName = selectedMcps[0]?.name ?? "";
  return `${firstName} and ${selectedMcps.length - 1} MCPs`;
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
    api.v2.userMcpServer.createIntegratedMcpServer.useMutation({
      onSuccess: () => {
        toast.success("統合MCPを作成しました");
        // キャッシュを更新
        void utils.v2.userMcpServer.findMcpServers.invalidate();
        // モーダルを閉じて状態をリセット
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

  // 選択済みMCPと未選択MCPを分離（Setで検索をO(1)に最適化）
  const { availableMcps, selectedMcps } = useMemo(() => {
    const selectedSet = new Set(selectedMcpIds);
    const selectedMap = new Map<string, SelectableMcp>();
    const available: SelectableMcp[] = [];

    for (const mcp of allMcps) {
      if (selectedSet.has(mcp.id)) {
        selectedMap.set(mcp.id, mcp);
      } else {
        available.push(mcp);
      }
    }

    // 選択順序を維持（selectedMcpIdsの順序でMapから取得）
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

    // サーバー名（未入力時はデフォルト名を使用）
    const serverName = name.trim() || generateDefaultName(selectedMcps);

    // 選択したMCPのtemplateInstancesから作成データを構築
    // toolIdsを省略することで、バックエンドがテンプレートの全ツールを自動選択
    const templates = selectedMcps.flatMap((mcp) =>
      mcp.templateInstances.map((instance) => ({
        mcpServerTemplateId: instance.mcpServerTemplate.id,
        normalizedName:
          instance.normalizedName || instance.mcpServerTemplate.name,
        // envVarsは既存のものを自動使用（省略）
      })),
    );

    createMutation.mutate({
      name: serverName,
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
          <DragDropContainer
            availableMcps={availableMcps}
            selectedMcps={selectedMcps}
            onSelect={handleSelect}
            onRemove={handleRemove}
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
