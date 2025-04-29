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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Edit,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { CreateApiKeyDialog } from "./dialogs/CreateApiKeyDialog";
import { EditApiKeyDialog } from "./dialogs/EditApiKeyDialog";
import { DeleteApiKeyDialog } from "./dialogs/DeleteApiKeyDialog";
import type { ApiKey, UserMcpServer } from "./types";
import { ToolBadge } from "./ToolBadge";

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

  const filteredApiKeys = apiKeys.filter(
    (key) =>
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ??
      key.servers.some((server) =>
        server.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const handleCreateApiKey = (apiKey: {
    name: string;
    servers: string[];
    tools: string[];
    toolGroups: string[];
  }) => {
    const newKey = `mcp_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 38)}`;

    // ツールの情報を追加
    const toolsInfo = apiKey.tools.map((id) => {
      return {
        id,
        name: `ツール ${id.split("-")[1]}`,
      };
    });

    // ツールグループの情報を追加
    const toolGroupsInfo = apiKey.toolGroups.map((id) => {
      return {
        id,
        name: `グループ ${id.split("-")[1]}`,
      };
    });

    const newApiKey: ApiKey = {
      id: `key-${apiKeys.length + 1}`,
      name: apiKey.name,
      key: newKey,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      servers: apiKey.servers.map((serverId) => {
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

  const handleEditApiKey = (apiKey: {
    id: string;
    name: string;
    servers: string[];
  }) => {
    const updatedApiKeys = apiKeys.map((key) => {
      if (key.id === apiKey.id) {
        return {
          ...key,
          name: apiKey.name,
          servers: apiKey.servers.map((serverId) => {
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

  const handleDeleteApiKey = (apiKeyId: string) => {
    const updatedApiKeys = apiKeys.filter((key) => key.id !== apiKeyId);
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
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (apiKey: ApiKey) => {
    setCurrentApiKey(apiKey);
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
              <TableHead className="w-[200px]">認証情報</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead>最終更新日</TableHead>
              <TableHead>ツール・ツールグループ</TableHead>
              <TableHead>接続サーバー</TableHead>
              <TableHead className="w-[100px]">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center">
                  API Keyが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              filteredApiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground text-xs">
                          API Key:
                        </span>
                        <span className="max-w-[220px] truncate font-mono text-sm">
                          {apiKey.key}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground text-xs">
                          URL:
                        </span>
                        <span className="max-w-[220px] truncate font-mono text-sm text-blue-600 underline">
                          https://api.mcp-server.com/...
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            copyToClipboard(
                              `https://api.mcp-server.com/${apiKey.key}`,
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                  <TableCell>
                    {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : "未更新"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.toolGroups
                        ?.slice(0, 5)
                        .map((group) => (
                          <ToolBadge
                            key={group.id}
                            type="toolGroup"
                            toolGroup={group}
                          />
                        ))}
                      {apiKey.tools.slice(0, 5).map((tool) => (
                        <ToolBadge key={tool.id} type="tool" tool={tool} />
                      ))}
                      {(apiKey.toolGroups?.length ?? 0) + apiKey.tools.length >
                        10 && (
                        <Badge variant="outline" className="bg-slate-100">
                          +
                          {(apiKey.toolGroups?.length ?? 0) +
                            apiKey.tools.length -
                            10}
                        </Badge>
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

      <EditApiKeyDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        currentApiKey={currentApiKey}
        mockUserMcpServers={mockUserMcpServers}
        onEditApiKey={handleEditApiKey}
      />

      <DeleteApiKeyDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        currentApiKey={currentApiKey}
        onDeleteApiKey={handleDeleteApiKey}
      />
    </Card>
  );
}
