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
import { ServerToolSelector } from "../../custom-servers/_components/dialogs/ServerToolSelector";
import { api } from "@/trpc/react";
import type { ToolId, UserMcpServerConfigId } from "@/schema/ids";
import { toast } from "@/utils/client/toast";
import { Loader2 } from "lucide-react";
import { ServerType } from "@tumiki/db/prisma";
import type { RouterOutputs } from "@/trpc/react";

type ServerInstance = RouterOutputs["userMcpServerInstance"]["findById"];

type EditServerDialogProps = {
  instance: NonNullable<ServerInstance>;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

export const EditServerDialog = ({
  instance,
  onClose,
  onSuccess,
}: EditServerDialogProps) => {
  const { data: userMcpServers, isLoading } =
    api.userMcpServerConfig.findServersWithTools.useQuery({});

  // サーバータイプに応じてフィルタリング
  const filteredServers =
    userMcpServers?.filter((server) => {
      if (instance.serverType === ServerType.OFFICIAL) {
        // 公式サーバーの場合は、現在のインスタンスの元となったMCPサーバーのみ表示
        return instance.toolGroup?.toolGroupTools?.some((toolGroupTool) =>
          server.tools.some(
            (serverTool) => serverTool.id === toolGroupTool.tool.id,
          ),
        );
      }
      // カスタムサーバーの場合は全て表示
      return true;
    }) ?? [];

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
  const [selectedServerIds, setSelectedServerIds] = useState<
    Set<UserMcpServerConfigId>
  >(new Set());
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<UserMcpServerConfigId, Set<ToolId>>
  >(new Map());

  // 初期値を設定
  useEffect(() => {
    if (!instance.toolGroup?.toolGroupTools || !userMcpServers || isLoading)
      return;

    // 現在有効なツールを集計
    const toolMap = new Map<UserMcpServerConfigId, Set<ToolId>>();
    const serverIdSet = new Set<UserMcpServerConfigId>();

    instance.toolGroup.toolGroupTools.forEach((toolGroupTool) => {
      const serverId =
        toolGroupTool.userMcpServerConfigId as UserMcpServerConfigId;
      const toolId = toolGroupTool.tool.id as ToolId;

      if (!toolMap.has(serverId)) {
        toolMap.set(serverId, new Set());
      }
      toolMap.get(serverId)?.add(toolId);
    });

    // 全てのツールが選択されているサーバーをselectedServerIdsに追加
    toolMap.forEach((toolIds, serverId) => {
      const server = userMcpServers.find((s) => {
        if (instance.serverType === ServerType.OFFICIAL) {
          // 公式サーバーの場合は、現在のインスタンスの元となったMCPサーバーのみ対象
          return (
            s.id === serverId &&
            instance.toolGroup?.toolGroupTools?.some((toolGroupTool) =>
              s.tools.some(
                (serverTool) => serverTool.id === toolGroupTool.tool.id,
              ),
            )
          );
        }
        // カスタムサーバーの場合は全て対象
        return s.id === serverId;
      });

      if (server && toolIds.size === server.tools.length) {
        serverIdSet.add(serverId);
        toolMap.delete(serverId); // 全選択の場合はtoolMapから削除
      }
    });

    setSelectedServerIds(serverIdSet);
    setSelectedToolIds(toolMap);
  }, [
    instance.id,
    instance.serverType,
    instance.toolGroup,
    userMcpServers,
    isLoading,
  ]);

  const isDisabled =
    !serverName.trim() ||
    (selectedServerIds.size === 0 && selectedToolIds.size === 0) ||
    isLoading;

  const handleUpdateServer = () => {
    if (isDisabled) return;

    const serverToolIdsMap: Record<UserMcpServerConfigId, ToolId[]> = {};

    selectedToolIds.forEach((toolIds, serverId) => {
      serverToolIdsMap[serverId] = Array.from(toolIds);
    });

    selectedServerIds.forEach((serverId) => {
      const tools = filteredServers.find(
        (server) => server.id === serverId,
      )?.tools;
      if (tools) {
        const toolIds = tools.map((tool) => tool.id);
        serverToolIdsMap[serverId] = toolIds;
      }
    });

    updateServerInstance({
      toolGroupId: instance.toolGroup.id,
      name: serverName,
      description: serverDescription,
      serverToolIdsMap: serverToolIdsMap,
    });
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
          <ServerToolSelector
            isLoading={isLoading}
            servers={filteredServers}
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
