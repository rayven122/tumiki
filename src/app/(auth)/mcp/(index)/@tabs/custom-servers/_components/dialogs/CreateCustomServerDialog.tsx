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
import type { ToolId, UserMcpServerConfigId } from "@/schema/ids";
import { toast } from "@/utils/client/toast";
import { Loader2 } from "lucide-react";

type CreateApiKeyDialogProps = {
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

export function CreateCustomServerDialog({
  onClose,
  onSuccess,
}: CreateApiKeyDialogProps) {
  const { data: userMcpServers, isLoading } =
    api.userMcpServerConfig.findAllWithTools.useQuery();

  const { mutate: addServerInstance, isPending } =
    api.userMcpServerInstance.addCustomServer.useMutation({
      onSuccess: async () => {
        await onSuccess();
        onClose();
        toast.success("カスタムMCPサーバーを作成しました");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const [serverName, setServerName] = useState("");
  const [selectedServerIds, setSelectedServerIds] = useState<
    Set<UserMcpServerConfigId>
  >(new Set());
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<UserMcpServerConfigId, Set<ToolId>>
  >(new Map());

  const isDisabled =
    !serverName.trim() ||
    (selectedServerIds.size === 0 && selectedToolIds.size === 0) ||
    isLoading;

  const handleCreateApiKey = () => {
    if (isDisabled) return;

    const serverToolIdsMap: Record<UserMcpServerConfigId, ToolId[]> = {};

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

    addServerInstance({
      name: serverName,
      serverToolIdsMap: serverToolIdsMap,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle>カスタムMCPサーバーを作成</DialogTitle>
          <DialogDescription>
            カスタムMCPサーバーを作成して、MCPサーバーへのアクセスを許可します
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              placeholder="Cursor 専用MCPサーバー"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
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
          <Button variant="outline" onClick={onClose}>
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
