"use client";

import { useState } from "react";
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
import { ServerToolSelector } from "./ServerToolSelector";
import { api } from "@/trpc/react";
import type { ToolId, UserMcpServerId } from "@/schema/ids";
import { toast } from "@/utils/client/toast";
import { Loader2 } from "lucide-react";

type CreateApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateApiKeyDialog({
  open,
  onOpenChange,
}: CreateApiKeyDialogProps) {
  const { data: userMcpServers, isLoading } =
    api.userMcpServer.findAllWithMcpServerTools.useQuery();
  const { mutate: createApiKey, isPending } = api.apiKey.add.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      toast.success("API Keyを作成しました");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [newKeyName, setNewKeyName] = useState("");
  const [selectedServerIds, setSelectedServerIds] = useState<
    Set<UserMcpServerId>
  >(new Set());
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<UserMcpServerId, Set<ToolId>>
  >(new Map());

  const isDisabled =
    !newKeyName.trim() ||
    (selectedServerIds.size === 0 && selectedToolIds.size === 0) ||
    isLoading;

  const handleCreateApiKey = () => {
    if (isDisabled) return;

    const serverToolIdsMap: Record<UserMcpServerId, ToolId[]> = {};

    selectedToolIds.forEach((toolIds, serverId) => {
      serverToolIdsMap[serverId] = Array.from(toolIds);
    });

    selectedServerIds.forEach((serverId) => {
      const tools = userMcpServers?.find(
        (server) => server.id === serverId,
      )?.tools;
      if (tools) {
        const toolIds = tools.map((tool) => tool.id);
        serverToolIdsMap[serverId] = toolIds;
      }
    });

    createApiKey({
      name: newKeyName,
      serverToolIdsMap: serverToolIdsMap,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle>新規API Key作成</DialogTitle>
          <DialogDescription>
            新しいAPI Keyを作成して、MCPサーバーへのアクセスを許可します
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">API Key名</Label>
            <Input
              id="name"
              placeholder="開発用API Key"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </div>
          <ServerToolSelector
            isLoading={isLoading}
            servers={userMcpServers ?? []}
            selectedServerIds={selectedServerIds}
            selectedToolIds={selectedToolIds}
            onServersChange={setSelectedServerIds}
            onToolsChange={setSelectedToolIds}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreateApiKey} disabled={isDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              "作成"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
