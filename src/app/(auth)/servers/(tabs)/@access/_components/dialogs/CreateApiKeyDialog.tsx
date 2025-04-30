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
import { ServerToolSelector } from "./ServerToolSelector";
import { api } from "@/trpc/react";

type CreateApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateApiKeyDialog({
  open,
  onOpenChange,
}: CreateApiKeyDialogProps) {
  const { data: userMcpServers, isLoading } =
    api.userMcpServer.findAllWithMcpServerTools.useQuery();
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedServerIds, setSelectedServerIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedToolIds, setSelectedToolIds] = useState<
    Map<string, Set<string>>
  >(new Map());

  const handleCreateApiKey = () => {
    if (!newKeyName.trim() || selectedServerIds.size === 0) {
      return;
    }

    // onCreateApiKey({
    //   name: newKeyName,
    //   servers: Array.from(selectedServerIds),
    //   tools: Array.from(selectedToolIds),
    // });

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
            isLoading={isLoading}
            servers={userMcpServers ?? []}
            selectedServerIds={selectedServerIds}
            selectedToolIds={selectedToolIds}
            onServersChange={setSelectedServerIds}
            onToolsChange={setSelectedToolIds}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleCreateApiKey}>作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
