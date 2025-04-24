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
import { Checkbox } from "@/components/ui/checkbox";
import { Server, CheckCircle2, Copy } from "lucide-react";
import { ToolSelectorDialog } from "@/app/(auth)/access/_components/ToolSelectorDialog";
import { ToolGroupSelectorDialog } from "@/app/(auth)/access/_components/ToolGroupSelectorDialog";
import { Badge } from "@/components/ui/badge";
import type { UserMcpServer } from "../types";

type CreateApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockUserMcpServers: UserMcpServer[];
  onCreateApiKey: (apiKey: {
    name: string;
    servers: string[];
    tools: string[];
    toolGroups: string[];
  }) => void;
};

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  mockUserMcpServers,
  onCreateApiKey,
}: CreateApiKeyDialogProps) {
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [isToolGroupSelectorOpen, setIsToolGroupSelectorOpen] = useState(false);
  const [selectedToolGroupIds, setSelectedToolGroupIds] = useState<string[]>(
    [],
  );

  const handleCreateApiKey = () => {
    if (!newKeyName.trim() || selectedServers.length === 0) {
      return;
    }

    const newKey = `mcp_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 38)}`;
    setGeneratedApiKey(newKey);

    onCreateApiKey({
      name: newKeyName,
      servers: selectedServers,
      tools: selectedToolIds,
      toolGroups: selectedToolGroupIds,
    });
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const handleClose = () => {
    setNewKeyName("");
    setSelectedServers([]);
    setGeneratedApiKey("");
    setShowApiKey(false);
    setSelectedToolIds([]);
    setSelectedToolGroupIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新規API Key作成</DialogTitle>
          <DialogDescription>
            新しいAPI Keyを作成して、MCPサーバーへのアクセスを許可します
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
                  {mockUserMcpServers.map((server) => (
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
                      {selectedToolGroupIds.map((groupId) => (
                        <Badge
                          key={groupId}
                          variant="outline"
                          className="border-purple-200 bg-purple-50 text-purple-700"
                        >
                          グループ {groupId.split("-")[1]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button onClick={handleCreateApiKey}>作成</Button>
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
              <Button onClick={handleClose}>閉じる</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <ToolSelectorDialog
        open={isToolSelectorOpen}
        onOpenChange={setIsToolSelectorOpen}
        selectedTools={selectedToolIds}
        onToolsChange={setSelectedToolIds}
      />

      <ToolGroupSelectorDialog
        open={isToolGroupSelectorOpen}
        onOpenChange={setIsToolGroupSelectorOpen}
        selectedGroups={selectedToolGroupIds}
        onGroupsChange={setSelectedToolGroupIds}
      />
    </Dialog>
  );
}
