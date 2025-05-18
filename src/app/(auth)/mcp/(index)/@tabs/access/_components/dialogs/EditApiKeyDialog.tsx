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
import { Checkbox } from "@/components/ui/checkbox";
import { Server } from "lucide-react";
import type { UserMcpServer } from "../types";
import type { ApiKey } from "../ApiKeysTab";

type EditApiKeyDialogProps = {
  open: boolean;
  onClose: () => void;
  currentApiKey: ApiKey;
  mockUserMcpServers: UserMcpServer[];
  onSuccess: () => void | Promise<void>;
};

export function EditApiKeyDialog({
  onClose,
  currentApiKey,
  mockUserMcpServers,
}: EditApiKeyDialogProps) {
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedServers, setSelectedServers] = useState<string[]>([]);

  useEffect(() => {
    if (currentApiKey) {
      setNewKeyName(currentApiKey.name);
      // setSelectedServers(currentApiKey.servers.map((server) => server.id));
    }
  }, [currentApiKey]);

  const handleEditApiKey = () => {
    if (!currentApiKey || !newKeyName.trim() || selectedServers.length === 0) {
      return;
    }

    // onEditApiKey({
    //   id: currentApiKey.id,
    //   name: newKeyName,
    //   servers: selectedServers,
    // });
  };

  return (
    <Dialog open>
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
                          src={server.mcpServer.iconPath ?? "/placeholder.svg"}
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
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleEditApiKey}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
