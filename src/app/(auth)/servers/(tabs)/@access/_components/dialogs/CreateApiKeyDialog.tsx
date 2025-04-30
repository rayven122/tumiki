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
import type { Prisma } from "@prisma/client";
import { ServerToolSelector } from "./ServerToolSelector";

type UserMcpServer = Prisma.UserMcpServerGetPayload<{
  include: {
    tools: true;
    mcpServer: true;
  };
}>;

const mockUserMcpServers: UserMcpServer[] = [
  {
    id: "mock-server-1",
    name: "開発用サーバー",
    envVars: "{}",
    mcpServerId: "mock-mcp-1",
    userId: "mock-user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    tools: [
      {
        id: "mock-tool-1",
        name: "ツール1",
        description: "ツール1の説明",
        isEnabled: true,
        mcpServerId: "mock-mcp-1",
        inputSchema: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "mock-tool-2",
        name: "ツール2",
        description: "ツール2の説明",
        isEnabled: true,
        mcpServerId: "mock-mcp-1",
        inputSchema: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    mcpServer: {
      id: "mock-mcp-1",
      name: "MCPサーバー1",
      iconPath: "/logos/notion.svg",
      envVars: [],
      command: "npm start",
      args: [],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: "mock-server-2",
    name: "本番用サーバー",
    envVars: "{}",
    mcpServerId: "mock-mcp-2",
    userId: "mock-user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    tools: [
      {
        id: "mock-tool-3",
        name: "ツール3",
        description: "ツール3の説明",
        isEnabled: true,
        mcpServerId: "mock-mcp-2",
        inputSchema: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    mcpServer: {
      id: "mock-mcp-2",
      name: "MCPサーバー2",
      // iconPath: "/icons/server2.png",
      iconPath: "/logos/github.svg",
      envVars: [],
      command: "npm start",
      args: [],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

type CreateApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateApiKey: (apiKey: {
    name: string;
    servers: string[];
    tools: string[];
  }) => void;
};

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreateApiKey,
}: CreateApiKeyDialogProps) {
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedServerIds, setSelectedServerIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(
    new Set(),
  );

  const handleCreateApiKey = () => {
    if (!newKeyName.trim() || selectedServerIds.size === 0) {
      return;
    }

    onCreateApiKey({
      name: newKeyName,
      servers: Array.from(selectedServerIds),
      tools: Array.from(selectedToolIds),
    });

    onOpenChange(false);
  };

  const handleClose = () => {
    setNewKeyName("");
    setSelectedServerIds(new Set());
    setSelectedToolIds(new Set());
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
          <ServerToolSelector
            servers={mockUserMcpServers}
            selectedServerIds={selectedServerIds}
            selectedToolIds={selectedToolIds}
            onServersChange={setSelectedServerIds}
            onToolsChange={setSelectedToolIds}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleCreateApiKey}>作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
