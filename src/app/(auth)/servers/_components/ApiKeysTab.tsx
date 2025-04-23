"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart2,
  CheckCircle2,
  Copy,
  Edit,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
} from "lucide-react";
import { ToolSelectorDialog } from "../../access/_components/ToolSelectorDialog";
import { ToolGroupSelectorDialog } from "../../access/_components/ToolGroupSelectorDialog";

// Mock data types
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

// Mock data
const mockApiKeys: ApiKey[] = [
  {
    id: "key-1",
    name: "開発用API Key",
    key: "mcp_dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    createdAt: "2023-10-15T10:30:00Z",
    lastUsed: "2023-10-20T14:22:00Z",
    servers: [
      { id: "server-1", name: "開発サーバー" },
      { id: "server-2", name: "テストサーバー" },
    ],
    tools: [
      { id: "tool-1", name: "テキスト生成" },
      { id: "tool-2", name: "画像生成" },
      { id: "tool-3", name: "音声認識" },
    ].concat(
      "key-1" === "key-1"
        ? Array.from({ length: 12 }, (_, i) => ({
            id: `tool-extra-${i + 1}`,
            name: `追加ツール ${i + 1}`,
          }))
        : [],
    ),
    toolGroups: [
      { id: "group-1", name: "基本ツールセット" },
      { id: "group-2", name: "開発者ツールセット" },
    ],
  },
  {
    id: "key-2",
    name: "本番環境API Key",
    key: "mcp_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    createdAt: "2023-09-05T08:15:00Z",
    lastUsed: "2023-10-21T09:45:00Z",
    servers: [{ id: "server-3", name: "本番サーバー" }],
    tools: [
      { id: "tool-1", name: "テキスト生成" },
      { id: "tool-2", name: "画像生成" },
      { id: "tool-3", name: "音声認識" },
    ].concat(
      false
        ? Array.from({ length: 12 }, (_, i) => ({
            id: `tool-extra-${i + 1}`,
            name: `追加ツール ${i + 1}`,
          }))
        : [],
    ),
    toolGroups: [{ id: "group-1", name: "基本ツールセット" }],
  },
  {
    id: "key-3",
    name: "デモ用API Key",
    key: "mcp_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    createdAt: "2023-10-01T16:20:00Z",
    lastUsed: null,
    servers: [
      { id: "server-2", name: "テストサーバー" },
      { id: "server-4", name: "デモサーバー" },
    ],
    tools: [
      { id: "tool-1", name: "テキスト生成" },
      { id: "tool-2", name: "画像生成" },
      { id: "tool-3", name: "音声認識" },
    ].concat(
      false
        ? Array.from({ length: 12 }, (_, i) => ({
            id: `tool-extra-${i + 1}`,
            name: `追加ツール ${i + 1}`,
          }))
        : [],
    ),
    toolGroups: [
      { id: "group-3", name: "コンテンツ制作ツールセット" },
      { id: "group-5", name: "チャットボットツールセット" },
    ],
  },
];

const mockUserMcpServers: UserMcpServer[] = [
  {
    id: "server-1",
    name: "開発サーバー",
    mcpServer: {
      id: "mcp-1",
      name: "開発MCP",
      iconPath: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "server-2",
    name: "テストサーバー",
    mcpServer: {
      id: "mcp-2",
      name: "テストMCP",
      iconPath: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "server-3",
    name: "本番サーバー",
    mcpServer: {
      id: "mcp-3",
      name: "本番MCP",
      iconPath: "/placeholder.svg?height=32&width=32",
    },
  },
  {
    id: "server-4",
    name: "デモサーバー",
    mcpServer: {
      id: "mcp-4",
      name: "デモMCP",
      iconPath: null,
    },
  },
];

export function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null);
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

  const filteredApiKeys = apiKeys.filter(
    (key) =>
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ??
      key.servers.some((server) =>
        server.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
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
      return {
        id,
        name: `グループ ${id.split("-")[1]}`,
      };
    });

    const newApiKey: ApiKey = {
      id: `key-${apiKeys.length + 1}`,
      name: newKeyName,
      key: newKey,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      servers: selectedServers.map((serverId) => {
        const server = mockUserMcpServers.find((s) => s.id === serverId);
        return {
          id: serverId,
          name: server?.name ?? "",
        };
      }),
      tools: toolsInfo,
      toolGroups: toolGroupsInfo,
    };

    setApiKeys([...apiKeys, newApiKey]);
  };

  const handleEditApiKey = () => {
    if (!currentApiKey || !newKeyName.trim() || selectedServers.length === 0) {
      return;
    }

    const updatedApiKeys = apiKeys.map((key) => {
      if (key.id === currentApiKey.id) {
        return {
          ...key,
          name: newKeyName,
          servers: selectedServers.map((serverId) => {
            const server = mockUserMcpServers.find((s) => s.id === serverId);
            return {
              id: serverId,
              name: server?.name ?? "",
            };
          }),
        };
      }
      return key;
    });

    setApiKeys(updatedApiKeys);
    setIsEditDialogOpen(false);
  };

  const handleDeleteApiKey = () => {
    if (!currentApiKey) return;

    const updatedApiKeys = apiKeys.filter((key) => key.id !== currentApiKey.id);
    setApiKeys(updatedApiKeys);
    setIsDeleteDialogOpen(false);
  };

  const handleRegenerateApiKey = (keyId: string) => {
    const newKey = `mcp_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 38)}`;

    const updatedApiKeys = apiKeys.map((key) => {
      if (key.id === keyId) {
        return {
          ...key,
          key: newKey,
          createdAt: new Date().toISOString(),
          lastUsed: null,
        };
      }
      return key;
    });

    setApiKeys(updatedApiKeys);
    setGeneratedApiKey(newKey);
    setShowApiKey(true);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "未使用";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const openCreateDialog = () => {
    setNewKeyName("");
    setSelectedServers([]);
    setGeneratedApiKey("");
    setShowApiKey(false);
    setIsCreateDialogOpen(true);
    setSelectedToolIds([]);
    setSelectedToolGroupIds([]);
  };

  const openEditDialog = (apiKey: ApiKey) => {
    setCurrentApiKey(apiKey);
    setNewKeyName(apiKey.name);
    setSelectedServers(apiKey.servers.map((server) => server.id));
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (apiKey: ApiKey) => {
    setCurrentApiKey(apiKey);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>API Keys</CardTitle>
          <div className="relative w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="API Keyを検索..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <CardDescription>
          MCPサーバーにアクセスするためのAPI Keyを管理します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead>最終更新日</TableHead>
              <TableHead>ツール</TableHead>
              <TableHead>ツールグループ</TableHead>
              <TableHead>接続サーバー</TableHead>
              <TableHead className="w-[100px]">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center">
                  API Keyが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              filteredApiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-blue-600 underline">
                        https://api.mcp-server.com/
                        {apiKey.key.substring(0, 10)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          copyToClipboard(
                            `https://api.mcp-server.com/${apiKey.key}`,
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                  <TableCell>
                    {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : "未更新"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.tools.slice(0, 5).map((tool) => (
                        <Badge
                          key={tool.id}
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          {tool.name}
                        </Badge>
                      ))}
                      {apiKey.tools.length > 5 && (
                        <Badge variant="outline" className="bg-slate-100">
                          +{apiKey.tools.length - 5}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.toolGroups && apiKey.toolGroups.length > 0 ? (
                        apiKey.toolGroups.map((group) => (
                          <Badge
                            key={group.id}
                            variant="outline"
                            className="border-purple-200 bg-purple-50 text-purple-700"
                          >
                            {group.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          なし
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.servers.map((server) => (
                        <Badge
                          key={server.id}
                          variant="outline"
                          className="bg-slate-100"
                        >
                          {server.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(apiKey)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRegenerateApiKey(apiKey.id)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          再生成
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(apiKey)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* 新規API Key作成ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                              setSelectedServers([
                                ...selectedServers,
                                server.id,
                              ]);
                            } else {
                              setSelectedServers(
                                selectedServers.filter(
                                  (id) => id !== server.id,
                                ),
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
                                  server.mcpServer.iconPath ??
                                  "/placeholder.svg"
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
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
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
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  閉じる
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* API Key編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key編集</DialogTitle>
            <DialogDescription>
              API Keyの名前と接続サーバーを編集します
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
            <div className="grid gap-2">
              <Label>接続サーバー</Label>
              <div className="max-h-60 overflow-y-auto rounded-md border p-4">
                {mockUserMcpServers.map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center space-x-2 py-2"
                  >
                    <Checkbox
                      id={`edit-server-${server.id}`}
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
                      htmlFor={`edit-server-${server.id}`}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={handleEditApiKey}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteApiKey}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </Card>
  );
}
