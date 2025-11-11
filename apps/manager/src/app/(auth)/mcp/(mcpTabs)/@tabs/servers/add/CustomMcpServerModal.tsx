"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { AuthType, TransportType } from "@tumiki/db/prisma";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type CustomMcpServerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CustomMcpServerModal = ({
  open,
  onOpenChange,
}: CustomMcpServerModalProps) => {
  const router = useRouter();
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transportType, setTransportType] =
    useState<TransportType>("STREAMABLE_HTTPS");
  const [authType, setAuthType] = useState<AuthType>("API_KEY");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  const { mutate: createServer, isPending } = api.mcpServer.create.useMutation({
    onSuccess: async () => {
      toast.success("カスタムMCPサーバーが正常に作成されました");
      await utils.mcpServer.invalidate();
      await utils.userMcpServerInstance.invalidate();
      onOpenChange(false);
      router.refresh();

      // Reset form
      setName("");
      setUrl("");
      setTransportType("STREAMABLE_HTTPS");
      setAuthType("API_KEY");
      setEnvVars({});
      setNewEnvKey("");
      setNewEnvValue("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddEnvVar = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      setEnvVars((prev) => ({
        ...prev,
        [newEnvKey.trim()]: newEnvValue.trim(),
      }));
      setNewEnvKey("");
      setNewEnvValue("");
    }
  };

  const handleRemoveEnvVar = (key: string) => {
    setEnvVars((prev) => {
      const newVars = { ...prev };
      delete newVars[key];
      return newVars;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("サーバー名を入力してください");
      return;
    }
    if (!url.trim()) {
      toast.error("URLを入力してください");
      return;
    }
    if (authType === "API_KEY" && Object.keys(envVars).length === 0) {
      toast.error("API_KEY認証を使用する場合、環境変数を追加してください");
      return;
    }

    createServer({
      name: name.trim(),
      url: url.trim(),
      transportType,
      authType,
      envVars,
      visibility: "PRIVATE",
    });
  };

  const isFormValid = () => {
    if (!name.trim() || !url.trim()) return false;
    if (authType === "API_KEY" && Object.keys(envVars).length === 0)
      return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <div className="relative max-h-[90vh] overflow-y-auto">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  サーバーを作成中...
                </span>
              </div>
            </div>
          )}

          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              カスタムMCPサーバーの追加
            </DialogTitle>
            <DialogDescription>
              カスタムURLからMCPサーバーを追加します。サーバー情報を入力してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Server Name */}
            <div className="space-y-2">
              <Label htmlFor="server-name">サーバー名 *</Label>
              <Input
                id="server-name"
                placeholder="例: My Custom MCP Server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="server-url">サーバーURL *</Label>
              <Input
                id="server-url"
                type="url"
                placeholder="例: https://example.com/mcp"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Transport Type */}
            <div className="space-y-2">
              <Label htmlFor="transport-type">トランスポートタイプ *</Label>
              <Select
                value={transportType}
                onValueChange={(value) =>
                  setTransportType(value as TransportType)
                }
                disabled={isPending}
              >
                <SelectTrigger id="transport-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STREAMABLE_HTTPS">
                    STREAMABLE_HTTPS
                  </SelectItem>
                  <SelectItem value="SSE">SSE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auth Type */}
            <div className="space-y-2">
              <Label htmlFor="auth-type">認証タイプ *</Label>
              <Select
                value={authType}
                onValueChange={(value) => setAuthType(value as AuthType)}
                disabled={isPending}
              >
                <SelectTrigger id="auth-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="API_KEY">API_KEY</SelectItem>
                  <SelectItem value="NONE">NONE</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {authType === "API_KEY" && "APIキーをヘッダーとして送信します"}
                {authType === "NONE" && "認証なしで接続します"}
              </p>
            </div>

            {/* Environment Variables */}
            {authType !== "NONE" && (
              <div className="space-y-3">
                <Label>環境変数 {authType === "API_KEY" && "*"}</Label>

                {/* Add new env var */}
                <div className="flex gap-2">
                  <Input
                    placeholder="キー名 (例: X-API-Key)"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddEnvVar()}
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Input
                    type="password"
                    placeholder="値"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddEnvVar()}
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddEnvVar}
                    disabled={
                      !newEnvKey.trim() || !newEnvValue.trim() || isPending
                    }
                    size="sm"
                  >
                    追加
                  </Button>
                </div>

                {/* Display existing env vars */}
                {Object.entries(envVars).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(envVars).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2"
                      >
                        <code className="flex-1 font-mono text-sm">
                          {key}: {value.substring(0, 20)}...
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEnvVar(key)}
                          disabled={isPending}
                        >
                          削除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {authType === "API_KEY" &&
                  Object.keys(envVars).length === 0 && (
                    <p className="text-sm text-yellow-600">
                      API_KEY認証には最低1つの環境変数が必要です
                    </p>
                  )}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                "作成"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
