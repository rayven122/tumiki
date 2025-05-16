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
import { EditApiKeyDialog } from "./dialogs/EditApiKeyDialog";
import { DeleteApiKeyDialog } from "./dialogs/DeleteApiKeyDialog";
import type { ApiKey, UserMcpServer } from "./types";
import { ToolBadgeList } from "./ToolBadgeList";
import { api } from "@/trpc/react";

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
  const { data } = api.apiKey.findAll.useQuery();
  const apiKeys = data ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null);

  const filteredApiKeys = apiKeys.filter(
    (key) =>
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ??
      key.toolGroups.some((group) =>
        group.toolGroupTools.some((toolGroupTool) =>
          toolGroupTool.tool.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        ),
      ),
  );

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

    // setApiKeys(updatedApiKeys);
    setIsEditDialogOpen(false);
  };

  const handleDeleteApiKey = (apiKeyId: string) => {
    // const updatedApiKeys = apiKeys.filter((key) => key.id !== apiKeyId);
    // setApiKeys(updatedApiKeys);
    setIsDeleteDialogOpen(false);
  };

  const handleRegenerateApiKey = (keyId: string) => {
    const newKey = `mcp_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 38)}`;

    // const updatedApiKeys = apiKeys.map((key) => {
    //   if (key.id === keyId) {
    //     return {
    //       ...key,
    //       key: newKey,
    //       createdAt: new Date().toISOString(),
    //       lastUsed: null,
    //     };
    //   }
    //   return key;
    // });

    // setApiKeys(updatedApiKeys);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // const openEditDialog = (apiKey: ApiKey) => {
  //   setCurrentApiKey(apiKey);
  //   setIsEditDialogOpen(true);
  // };

  // const openDeleteDialog = (apiKey: ApiKey) => {
  //   setCurrentApiKey(apiKey);
  //   setIsDeleteDialogOpen(true);
  // };

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
              filteredApiKeys.map((apiKey) => {
                const tools = apiKey.toolGroups.flatMap((toolGroup) =>
                  toolGroup.toolGroupTools.map((toolGroupTool) => ({
                    ...toolGroupTool.tool,
                    userMcpServerName: toolGroupTool.userMcpServer.name ?? "",
                  })),
                );
                const serverNameSet = new Set(
                  apiKey.toolGroups.flatMap((toolGroup) =>
                    toolGroup.toolGroupTools.map(
                      (toolGroupTool) => toolGroupTool.userMcpServer.name,
                    ),
                  ),
                );
                const serverNameList = Array.from(serverNameSet);
                return (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground text-xs">
                            API Key:
                          </span>
                          <span className="max-w-[220px] truncate font-mono text-sm">
                            {apiKey.id}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(apiKey.id)}
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
                                `https://api.mcp-server.com/${apiKey.id}`,
                              )
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                    <TableCell>{formatDate(apiKey.updatedAt)}</TableCell>
                    <TableCell>
                      <ToolBadgeList
                        tools={tools}
                        toolGroups={apiKey.toolGroups}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {serverNameList.map((serverName) => (
                          <Badge
                            key={serverName}
                            variant="outline"
                            className="bg-slate-100"
                          >
                            {serverName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                          // onClick={() => openEditDialog(apiKey)}
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
                            // onClick={() => openDeleteDialog(apiKey)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
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
