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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Copy, Server } from "lucide-react";
import { ToolSelectorDialog } from "../../access/_components/ToolSelectorDialog";
import { ToolGroupSelectorDialog } from "../../access/_components/ToolGroupSelectorDialog";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  servers: {
    id: string;
    name: string;
  }[];
  tools: {
    id: string;
    name: string;
  }[];
  toolGroups?: {
    id: string;
    name: string;
  }[];
};

type UserMcpServer = {
  id: string;
  name: string;
  mcpServer: {
    id: string;
    name: string;
    iconPath: string | null;
  };
};

type ToolGroup = {
  id: string;
  name: string;
  description: string;
  tools: {
    id: string;
    name: string;
  }[];
};

type ApiKeyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "delete";
  currentApiKey?: ApiKey | null;
  onSave?: (apiKey: Omit<ApiKey, "id">) => void;
  onDelete?: () => void;
  servers: UserMcpServer[];
  toolGroups: ToolGroup[];
};

export function ApiKeyModal({
  open,
  onOpenChange,
  mode,
  currentApiKey,
  onSave,
  onDelete,
  servers,
  toolGroups,
}: ApiKeyModalProps) {
  const [newKeyName, setNewKeyName] = useState(currentApiKey?.name ?? "");
  const [selectedServers, setSelectedServers] = useState<string[]>(
    currentApiKey?.servers.map((server) => server.id) ?? [],
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    currentApiKey?.tools.map((tool) => tool.id) ?? [],
  );
  const [isToolGroupSelectorOpen, setIsToolGroupSelectorOpen] = useState(false);
  const [selectedToolGroupIds, setSelectedToolGroupIds] = useState<string[]>(
    currentApiKey?.toolGroups?.map((group) => group.id) ?? [],
  );

  const handleCreateApiKey = () => {
    if (!newKeyName.trim() || selectedServers.length === 0) {
      return;
    }

    const newKey = `mcp_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 38)}`;
    setGeneratedApiKey(newKey);

    // ツールの情報を追加
    const toolsInfo = selectedToolIds.map((id) => {
      return {
        id,
        name: `ツール ${id.split("-")[1]}`,
      };
    });

    // ツールグループの情報を追加
    const toolGroupsInfo = selectedToolGroupIds.map((id) => {
      const group = toolGroups.find((g) => g.id === id);
      return {
        id,
        name: group?.name ?? `グループ ${id.split("-")[1]}`,
      };
    });

    const newApiKey: Omit<ApiKey, "id"> = {
      name: newKeyName,
      key: newKey,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      servers: selectedServers.map((serverId) => {
        const server = servers.find((s) => s.id === serverId);
        return {
          id: serverId,
          name: server?.name ?? "",
        };
      }),
      tools: toolsInfo,
      toolGroups: toolGroupsInfo,
    };

    onSave?.(newApiKey);
  };

  const handleEditApiKey = () => {
    if (!currentApiKey || !newKeyName.trim() || selectedServers.length === 0) {
      return;
    }

    const updatedApiKey: Omit<ApiKey, "id"> = {
      ...currentApiKey,
      name: newKeyName,
      servers: selectedServers.map((serverId) => {
        const server = servers.find((s) => s.id === serverId);
        return {
          id: serverId,
          name: server?.name ?? "",
        };
      }),
    };

    onSave?.(updatedApiKey);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  if (mode === "delete") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key削除</DialogTitle>
            <DialogDescription>
              このAPI Keyを削除してもよろしいですか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-2 text-sm">
              以下のAPI Keyを削除します：
            </p>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="font-medium">{currentApiKey?.name}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                接続サーバー：
                {currentApiKey?.servers.map((server) => server.name).join(", ")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "新規API Key作成" : "API Key編集"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "新しいAPI Keyを作成して、MCPサーバーへのアクセスを許可します"
              : "API Keyの名前と接続サーバーを編集します"}
          </DialogDescription>
        </DialogHeader>
        {!generatedApiKey ? (
          <>
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
              <div className="grid gap-2">
                <Label>接続サーバー</Label>
                <div className="max-h-60 overflow-y-auto rounded-md border p-4">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className="flex items-center space-x-2 py-2"
                    >
                      <Checkbox
                        id={`server-${server.id}`}
                        checked={selectedServers.includes(server.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedServers([...selectedServers, server.id]);
                          } else {
                            setSelectedServers(
                              selectedServers.filter((id) => id !== server.id),
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={`server-${server.id}`}
                        className="flex cursor-pointer items-center space-x-2"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
                          {server.mcpServer.iconPath ? (
                            <img
                              src={
                                server.mcpServer.iconPath ?? "/placeholder.svg"
                              }
                              alt={server.name}
                              className="h-4 w-4"
                            />
                          ) : (
                            <Server className="h-3 w-3 text-slate-500" />
                          )}
                        </div>
                        <span>{server.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              {mode === "create" && (
                <>
                  <div className="mt-4 grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>ツール</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsToolSelectorOpen(true);
                        }}
                      >
                        個別ツールを選択
                      </Button>
                    </div>
                    <div className="rounded-md border p-3">
                      {selectedToolIds.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          ツールが選択されていません
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {selectedToolIds.length > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700"
                            >
                              {selectedToolIds.length}個のツールを選択中
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>ツールグループ</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsToolGroupSelectorOpen(true);
                        }}
                      >
                        ツールグループを選択
                      </Button>
                    </div>
                    <div className="rounded-md border p-3">
                      {selectedToolGroupIds.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          ツールグループが選択されていません
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {toolGroups
                            .filter((group) =>
                              selectedToolGroupIds.includes(group.id),
                            )
                            .map((group) => (
                              <Badge
                                key={group.id}
                                variant="outline"
                                className="border-purple-200 bg-purple-50 text-purple-700"
                              >
                                {group.name}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button
                onClick={
                  mode === "create" ? handleCreateApiKey : handleEditApiKey
                }
              >
                {mode === "create" ? "作成" : "保存"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-6">
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      API Keyが作成されました
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        このAPI
                        Keyは一度だけ表示されます。安全な場所に保存してください。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Input
                  readOnly
                  value={generatedApiKey}
                  type={showApiKey ? "text" : "password"}
                  className="pr-24 font-mono"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-12 h-full px-2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? "隠す" : "表示"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 h-full px-2"
                  onClick={() => copyToClipboard(generatedApiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>閉じる</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {/* ツール選択ダイアログ */}
      <ToolSelectorDialog
        open={isToolSelectorOpen}
        onOpenChange={setIsToolSelectorOpen}
        selectedTools={selectedToolIds}
        onToolsChange={setSelectedToolIds}
      />

      {/* ツールグループ選択ダイアログ */}
      <ToolGroupSelectorDialog
        open={isToolGroupSelectorOpen}
        onOpenChange={setIsToolGroupSelectorOpen}
        selectedGroups={selectedToolGroupIds}
        onGroupsChange={setSelectedToolGroupIds}
      />
    </Dialog>
  );
}
