"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import type { McpToolId } from "@/schema/ids";
import { toast } from "@/utils/client/toast";
import { Loader2 } from "lucide-react";
import { ServerType } from "@tumiki/db/prisma";
import type { RouterOutputs } from "@/trpc/react";
import { Checkbox } from "@/components/ui/checkbox";

type ServerInstance = RouterOutputs["userMcpServerInstance"]["findById"];

type EditServerDialogProps = {
  instance: NonNullable<ServerInstance>;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

/**
 * 新スキーマ：EditServerDialog
 * - toolGroup削除
 * - allowedToolsとavailableToolsを使用
 */
export const EditServerDialog = ({
  instance,
  onClose,
  onSuccess,
}: EditServerDialogProps) => {
  const { mutate: updateServerInstance, isPending } =
    api.userMcpServerInstance.update.useMutation({
      onSuccess: async () => {
        await onSuccess();
        onClose();
        toast.success("MCPサーバーを更新しました");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const [serverName, setServerName] = useState(instance.name);
  const [serverDescription, setServerDescription] = useState(
    instance.description ?? "",
  );
  const [selectedToolIds, setSelectedToolIds] = useState<Set<McpToolId>>(
    new Set(),
  );

  // 初期値を設定：現在有効なツール
  useEffect(() => {
    if (!instance.allowedTools) return;

    const toolIds = new Set<McpToolId>(
      instance.allowedTools.map((t) => t.id as McpToolId),
    );
    setSelectedToolIds(toolIds);
  }, [instance.id, instance.allowedTools]);

  const isDisabled = !serverName.trim() || selectedToolIds.size === 0;

  const handleUpdateServer = () => {
    if (isDisabled) return;

    updateServerInstance({
      id: instance.id,
      name: serverName,
      description: serverDescription,
      allowedToolIds: Array.from(selectedToolIds),
    });
  };

  const handleToolToggle = (toolId: McpToolId, checked: boolean) => {
    const newSet = new Set(selectedToolIds);
    if (checked) {
      newSet.add(toolId);
    } else {
      newSet.delete(toolId);
    }
    setSelectedToolIds(newSet);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle>MCPサーバーを編集</DialogTitle>
          <DialogDescription>
            MCPサーバーの名前と接続するツールを編集します
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              placeholder="サーバー名を入力"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
          </div>
          {instance.serverType === ServerType.CUSTOM && (
            <div className="grid gap-2">
              <Label htmlFor="description">概要</Label>
              <Textarea
                id="description"
                placeholder="サーバーの概要を入力（任意）"
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>ツール選択</Label>
            <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-4">
              {instance.availableTools?.map((tool) => (
                <div key={tool.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tool-${tool.id}`}
                    checked={selectedToolIds.has(tool.id as McpToolId)}
                    onCheckedChange={(checked) =>
                      handleToolToggle(tool.id as McpToolId, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`tool-${tool.id}`}
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tool.name}
                    {tool.description && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        - {tool.description}
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleUpdateServer} disabled={isDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              "更新"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
