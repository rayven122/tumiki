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

import { api, type RouterOutputs } from "@/trpc/react";
import type { ToolId, UserMcpServerConfigId } from "@/schema/ids";
import { ServerToolSelector } from "../../custom-servers/_components/dialogs/ServerToolSelector";
import { toast } from "@/utils/client/toast";
import { ServerType } from "@tumiki/db/prisma";

type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findCustomServers"][number];

type EditServerInstanceModalProps = {
  onClose: () => void;
  serverInstance: ServerInstance;
  onSuccess: () => void | Promise<void>;
};

const getInitialToolIds = (tools: ServerInstance["tools"]) => {
  const map = new Map<UserMcpServerConfigId, Set<ToolId>>();

  console.log({ tools });

  tools.forEach((tool) => {
    const toolSet = map.get(tool.userMcpServerConfigId);
    if (toolSet) {
      toolSet.add(tool.id);
      map.set(tool.userMcpServerConfigId, toolSet);
    } else {
      map.set(tool.userMcpServerConfigId, new Set([tool.id]));
    }
  });

  return map;
};

// userMcpServerConfig の tools の個数と ServerInstanceToolGroup の個数が同じ場合は、serverIds にチェックを入れる
const getInitialServerIds = (
  tools: ServerInstance["tools"],
  userMcpServers: ServerInstance["userMcpServers"],
) => {
  const serverIdsSet = new Set<UserMcpServerConfigId>();

  console.log({ userMcpServers, tools });

  userMcpServers.forEach((userMcpServer) => {
    const toolsCount = userMcpServer.tools.length;
    const toolGroupToolsCount = tools.filter(
      ({ userMcpServerConfigId }) => userMcpServerConfigId === userMcpServer.id,
    ).length;
    if (toolGroupToolsCount >= toolsCount) {
      serverIdsSet.add(userMcpServer.id);
    }
  });

  return serverIdsSet;
};

export function EditServerInstanceModal({
  onClose,
  serverInstance,
  onSuccess,
}: EditServerInstanceModalProps) {
  const { data: userMcpServers, isLoading } =
    api.userMcpServerConfig.findServersWithTools.useQuery({
      userMcpServerConfigIds:
        serverInstance.serverType === ServerType.OFFICIAL
          ? serverInstance.userMcpServers.map(({ id }) => id)
          : undefined,
    });

  const { mutate: updateServerInstance, isPending } =
    api.userMcpServerInstance.update.useMutation({
      onSuccess: async () => {
        await onSuccess();
        onClose();
        toast.success(`${serverInstance.name} を更新しました`);
      },
      onError: () => {
        toast.error("カスタムMCPサーバーの更新に失敗しました");
      },
    });

  const [serverName, setServerName] = useState(serverInstance.name);

  const [selectedServerIds, setSelectedServerIds] = useState<
    Set<UserMcpServerConfigId>
  >(getInitialServerIds(serverInstance.tools, serverInstance.userMcpServers));
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<UserMcpServerConfigId, Set<ToolId>>
  >(getInitialToolIds(serverInstance.tools));

  const isDisabled =
    !serverName.trim() ||
    (selectedServerIds.size === 0 && selectedToolIds.size === 0) ||
    isLoading;

  const handleEditServerInstance = () => {
    if (isDisabled) return;

    console.log({ selectedServerIds, selectedToolIds });

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

    updateServerInstance({
      name: serverName,
      serverToolIdsMap: serverToolIdsMap,
      toolGroupId: serverInstance.toolGroupId,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[80%]">
        <DialogHeader>
          <DialogTitle>サーバー編集</DialogTitle>
          <DialogDescription>
            サーバー名と接続MCPサーバーおよびツールを編集します
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">サーバー名</Label>
            <Input
              id="edit-name"
              placeholder="サーバー名"
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
          <Button onClick={handleEditServerInstance} disabled={isDisabled}>
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
}
