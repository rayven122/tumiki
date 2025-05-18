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
import { Loader2 } from "lucide-react";
import type { ApiKey } from "../ApiKeysTab";
import { api } from "@/trpc/react";
import type { ToolId, UserMcpServerId } from "@/schema/ids";
import { ServerToolSelector } from "./ServerToolSelector";
import { toast } from "@/utils/client/toast";

type EditApiKeyDialogProps = {
  onClose: () => void;
  apiKey: ApiKey;
  onSuccess: () => void | Promise<void>;
};

export function EditApiKeyDialog({
  onClose,
  apiKey,
  onSuccess,
}: EditApiKeyDialogProps) {
  const { data: userMcpServers, isLoading } =
    api.userMcpServer.findAllWithMcpServerTools.useQuery();

  const { mutate: updateApiKey, isPending } = api.apiKey.update.useMutation({
    onSuccess: async (data) => {
      await onSuccess();
      onClose();
      toast.success(`API Keyを更新しました: ${data.name}`);
    },
    onError: () => {
      toast.error("API Keyの更新に失敗しました");
    },
  });

  const [newKeyName, setNewKeyName] = useState(apiKey.name);

  const [selectedServerIds, setSelectedServerIds] = useState<
    Set<UserMcpServerId>
  >(new Set());
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<UserMcpServerId, Set<ToolId>>
  >(() => {
    const map = new Map<UserMcpServerId, Set<ToolId>>();
    apiKey.toolGroups.forEach((toolGroup) => {
      toolGroup.toolGroupTools.forEach((toolGroupTool) => {
        const toolIds = map.get(toolGroupTool.userMcpServer.id);
        if (toolIds) {
          toolIds.add(toolGroupTool.tool.id);
          map.set(toolGroupTool.userMcpServer.id, toolIds);
        } else {
          map.set(
            toolGroupTool.userMcpServer.id,
            new Set([toolGroupTool.tool.id]),
          );
        }
      });
    });
    return map;
  });
  const isDisabled =
    !newKeyName.trim() ||
    (selectedServerIds.size === 0 && selectedToolIds.size === 0) ||
    isLoading;

  const handleEditApiKey = () => {
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

    updateApiKey({
      id: apiKey.id,
      name: newKeyName,
      serverToolIdsMap: serverToolIdsMap,
    });
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key編集</DialogTitle>
          <DialogDescription>
            API Keyの名前と接続MCPサーバーおよびツールを編集します
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">API Key名</Label>
            <Input
              id="edit-name"
              placeholder="API Key名"
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
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleEditApiKey}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                編集中...
              </>
            ) : (
              "編集"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
