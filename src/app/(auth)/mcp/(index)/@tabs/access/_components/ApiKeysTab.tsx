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
import { Copy, Edit, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { EditApiKeyDialog } from "./dialogs/EditApiKeyDialog";
import { DeleteApiKeyDialog } from "./dialogs/DeleteApiKeyDialog";
import { ToolBadgeList } from "./ToolBadgeList";
import { type RouterOutputs } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "@/utils/client/toast";

const MCP_PROXY_SERVER_URL =
  "https://fast-mcp-server-proxy-production.up.railway.app";

const makeMcpProxyServerUrl = (apiKeyId: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp?api-key=${apiKeyId}`;
};

export type ApiKey = RouterOutputs["apiKey"]["findAll"][number];

type ApiKeysTabProps = {
  apiKeys: ApiKey[];
};

export function ApiKeysTab({ apiKeys }: ApiKeysTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null);
  const router = useRouter();

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

  // const handleEditApiKey = (apiKey: {
  //   id: string;
  //   name: string;
  //   servers: string[];
  // }) => {
  //   const updatedApiKeys = apiKeys.map((key) => {
  //     if (key.id === apiKey.id) {
  //       return {
  //         ...key,
  //         name: apiKey.name,
  //         servers: apiKey.servers.map((serverId) => {
  //           const server = mockUserMcpServers.find((s) => s.id === serverId);
  //           return {
  //             id: serverId,
  //             name: server?.name ?? "",
  //           };
  //         }),
  //       };
  //     }
  //     return key;
  //   });

  //   // setApiKeys(updatedApiKeys);
  //   setIsEditDialogOpen(false);
  // };

  // TODO: 再生成機能の実装
  // const handleRegenerateApiKey = (keyId: string) => {
  //   const newKey = `mcp_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 38)}`;

  //   // const updatedApiKeys = apiKeys.map((key) => {
  //   //   if (key.id === keyId) {
  //   //     return {
  //   //       ...key,
  //   //       key: newKey,
  //   //       createdAt: new Date().toISOString(),
  //   //       lastUsed: null,
  //   //     };
  //   //   }
  //   //   return key;
  //   // });

  //   // setApiKeys(updatedApiKeys);
  // };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
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
                            Key:
                          </span>
                          <span className="max-w-[220px] truncate font-mono text-sm">
                            {apiKey.id}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              await copyToClipboard(apiKey.id);
                              toast.success("Keyをコピーしました");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground text-xs">
                            URL:
                          </span>
                          <span className="max-w-[220px] truncate font-mono text-sm text-blue-600 underline">
                            {makeMcpProxyServerUrl(apiKey.id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              await copyToClipboard(
                                makeMcpProxyServerUrl(apiKey.id),
                              );
                              toast.success("URLをコピーしました");
                            }}
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
                        // TODO: ツールグループの実装が完了したら設定する
                        toolGroups={[]}
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
                            onClick={() => {
                              setCurrentApiKey(apiKey);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          {/* <DropdownMenuItem
                            onClick={() => handleRegenerateApiKey(apiKey.id)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            再生成
                          </DropdownMenuItem> */}
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentApiKey(apiKey);
                              setIsDeleteDialogOpen(true);
                            }}
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

      {isEditDialogOpen && currentApiKey && (
        <EditApiKeyDialog
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          currentApiKey={currentApiKey}
          mockUserMcpServers={[]}
          // mockUserMcpServers={mockUserMcpServers}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {isDeleteDialogOpen && currentApiKey && (
        <DeleteApiKeyDialog
          onClose={() => setIsDeleteDialogOpen(false)}
          apiKey={currentApiKey}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
