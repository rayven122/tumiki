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
import { api, type RouterOutputs } from "@/trpc/react";
import type { ToolId, UserMcpServerId } from "@/schema/ids";
import { ServerToolSelector } from "./ServerToolSelector";
import { toast } from "@/utils/client/toast";

type UserMcpServer =
  RouterOutputs["userMcpServer"]["findAllWithMcpServerTools"][number];
type EditApiKeyDialogProps = {
  onClose: () => void;
  apiKey: ApiKey;
  onSuccess: () => void | Promise<void>;
};

const getInitialToolIds = (toolGroups: ApiKey["toolGroups"]) => {
  const map = new Map<UserMcpServerId, Set<ToolId>>();
  toolGroups.forEach((toolGroup) => {
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
};

// userMcpServer の tools の個数と apiKeyToolGroup の個数が同じ場合は、serverIds にチェックを入れる
const getInitialServerIds = (
  toolGroups: ApiKey["toolGroups"],
  userMcpServers: UserMcpServer[],
) => {
  const serverIdsSet = new Set<UserMcpServerId>();
  const apiKeyToolGroup = toolGroups.find(({ isEnabled }) => !isEnabled);
  if (!apiKeyToolGroup) return serverIdsSet;

  userMcpServers.forEach((userMcpServer) => {
    const toolsCount = userMcpServer.tools.length;
    const toolGroupToolsCount = apiKeyToolGroup.toolGroupTools.filter(
      ({ userMcpServer: server }) => server.id === userMcpServer.id,
    ).length;
    if (toolGroupToolsCount >= toolsCount) {
      serverIdsSet.add(userMcpServer.id);
    }
  });

  return serverIdsSet;
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
  >(getInitialServerIds(apiKey.toolGroups, userMcpServers ?? []));
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<UserMcpServerId, Set<ToolId>>
  >(getInitialToolIds(apiKey.toolGroups));

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

    const apiKeyToolGroupId = apiKey.toolGroups.find(
      ({ isEnabled }) => !isEnabled,
    )?.id;
    if (!apiKeyToolGroupId) {
      toast.error("API Keyの更新に失敗しました");
      return;
    }

    updateApiKey({
      id: apiKey.id,
      name: newKeyName,
      serverToolIdsMap: serverToolIdsMap,
      apiKeyToolGroupId: apiKeyToolGroupId,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[80%]">
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
          <Button onClick={handleEditApiKey} disabled={isDisabled}>
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
