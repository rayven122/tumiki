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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Copy, Key, Plus, Server, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ToolSelectorDialog } from "./_components/ToolSelectorDialog";
import { ToolGroupCard } from "./_components/ToolGroupCard";
import { ToolGroupDialog } from "./_components/ToolGroupDialog";
import { ToolGroupSelectorDialog } from "./_components/ToolGroupSelectorDialog";
import { ApiKeysTab } from "../mcp/_components/ApiKeysTab";
import { ApiKeyModal } from "../mcp/_components/ApiKeyModal";

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

const mockToolGroups: ToolGroup[] = [
  {
    id: "group-1",
    name: "基本ツールセット",
    description: "基本的なAI機能を提供するツールのセット",
    tools: [
      { id: "tool-1", name: "テキスト生成" },
      { id: "tool-2", name: "画像生成" },
      { id: "tool-3", name: "音声認識" },
    ],
  },
  {
    id: "group-2",
    name: "開発者ツールセット",
    description: "開発者向けの高度なツールのセット",
    tools: [
      { id: "tool-1", name: "テキスト生成" },
      { id: "tool-2", name: "画像生成" },
      { id: "tool-13", name: "コード生成" },
      { id: "tool-14", name: "データ分析" },
    ],
  },
  {
    id: "group-3",
    name: "コンテンツ制作ツールセット",
    description: "コンテンツ制作に特化したツールのセット",
    tools: [
      { id: "tool-2", name: "画像生成" },
      { id: "tool-5", name: "要約" },
      { id: "tool-11", name: "音声合成" },
    ],
  },
  {
    id: "group-4",
    name: "データ分析ツールセット",
    description: "データ分析に特化したツールのセット",
    tools: [
      { id: "tool-6", name: "感情分析" },
      { id: "tool-7", name: "エンティティ抽出" },
      { id: "tool-9", name: "文書分類" },
      { id: "tool-14", name: "データ分析" },
      { id: "tool-15", name: "レコメンデーション" },
    ],
  },
  {
    id: "group-5",
    name: "チャットボットツールセット",
    description: "チャットボット開発に必要なツールのセット",
    tools: [
      { id: "tool-1", name: "テキスト生成" },
      { id: "tool-3", name: "音声認識" },
      { id: "tool-8", name: "質問応答" },
      { id: "tool-12", name: "チャットボット" },
    ],
  },
];

export default function MCPAccessManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null);
  const [toolGroups, setToolGroups] = useState<ToolGroup[]>(mockToolGroups);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [currentToolGroup, setCurrentToolGroup] = useState<ToolGroup | null>(
    null,
  );

  const handleCreateApiKey = (newApiKey: Omit<ApiKey, "id">) => {
    const apiKey: ApiKey = {
      id: `key-${apiKeys.length + 1}`,
      ...newApiKey,
    };
    setApiKeys([...apiKeys, apiKey]);
    setIsCreateDialogOpen(false);
  };

  const handleEditApiKey = (updatedApiKey: Omit<ApiKey, "id">) => {
    if (!currentApiKey) return;

    const updatedApiKeys = apiKeys.map((key) => {
      if (key.id === currentApiKey.id) {
        return {
          ...key,
          ...updatedApiKey,
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

  const openCreateDialog = () => {
    setCurrentApiKey(null);
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

  const handleCreateToolGroup = (group: Omit<ToolGroup, "id">) => {
    const newGroup: ToolGroup = {
      id: `group-${toolGroups.length + 1}`,
      ...group,
    };
    setToolGroups([...toolGroups, newGroup]);
  };

  const handleEditToolGroup = (group: Omit<ToolGroup, "id">) => {
    if (!currentToolGroup) return;

    const updatedGroups = toolGroups.map((g) => {
      if (g.id === currentToolGroup.id) {
        return {
          ...g,
          name: group.name,
          description: group.description,
          tools: group.tools,
        };
      }
      return g;
    });

    setToolGroups(updatedGroups);
  };

  const handleDeleteToolGroup = () => {
    if (!currentToolGroup) return;

    const updatedGroups = toolGroups.filter(
      (group) => group.id !== currentToolGroup.id,
    );
    setToolGroups(updatedGroups);
    setIsDeleteGroupDialogOpen(false);
  };

  const openEditGroupDialog = (groupId: string) => {
    const group = toolGroups.find((g) => g.id === groupId);
    if (group) {
      setCurrentToolGroup(group);
      setIsEditGroupDialogOpen(true);
    }
  };

  const openDeleteGroupDialog = (groupId: string) => {
    const group = toolGroups.find((g) => g.id === groupId);
    if (group) {
      setCurrentToolGroup(group);
      setIsDeleteGroupDialogOpen(true);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCPサーバーアクセス管理</h1>
          <p className="text-muted-foreground mt-1">
            API Keyを管理して、MCPサーバーへのアクセスを制御します
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新規API Key作成
        </Button>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="keys" className="flex items-center">
            <Key className="mr-2 h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="tool-groups" className="flex items-center">
            <Layers className="mr-2 h-4 w-4" />
            ツールグループ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="tool-groups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ツールグループ</CardTitle>
                  <CardDescription>
                    複数のツールをグループ化して管理します
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateGroupDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  新規グループ作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {toolGroups.map((group) => (
                  <ToolGroupCard
                    key={group.id}
                    group={group}
                    onEdit={openEditGroupDialog}
                    onDelete={openDeleteGroupDialog}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Key作成ダイアログ */}
      <ApiKeyModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
        onSave={handleCreateApiKey}
        servers={mockUserMcpServers}
        toolGroups={toolGroups}
      />

      {/* API Key編集ダイアログ */}
      <ApiKeyModal
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        currentApiKey={currentApiKey}
        onSave={handleEditApiKey}
        servers={mockUserMcpServers}
        toolGroups={toolGroups}
      />

      {/* API Key削除ダイアログ */}
      <ApiKeyModal
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        mode="delete"
        currentApiKey={currentApiKey}
        onDelete={handleDeleteApiKey}
        servers={mockUserMcpServers}
        toolGroups={toolGroups}
      />

      {/* 新規ツールグループ作成ダイアログ */}
      <ToolGroupDialog
        open={isCreateGroupDialogOpen}
        onOpenChange={setIsCreateGroupDialogOpen}
        onSave={handleCreateToolGroup}
      />

      {/* ツールグループ編集ダイアログ */}
      <ToolGroupDialog
        open={isEditGroupDialogOpen}
        onOpenChange={setIsEditGroupDialogOpen}
        group={currentToolGroup ?? undefined}
        onSave={handleEditToolGroup}
      />

      {/* ツールグループ削除確認ダイアログ */}
      <Dialog
        open={isDeleteGroupDialogOpen}
        onOpenChange={setIsDeleteGroupDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ツールグループ削除</DialogTitle>
            <DialogDescription>
              このツールグループを削除してもよろしいですか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-2 text-sm">
              以下のツールグループを削除します：
            </p>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="font-medium">{currentToolGroup?.name}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {currentToolGroup?.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {currentToolGroup?.tools.map((tool) => (
                  <Badge
                    key={tool.id}
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    {tool.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteGroupDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteToolGroup}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
