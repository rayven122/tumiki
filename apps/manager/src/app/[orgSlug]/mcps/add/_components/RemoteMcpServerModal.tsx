"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { TransportType } from "@tumiki/db/prisma";
import { normalizeSlug } from "@tumiki/db/utils/slug";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "react-toastify";
import { useCreateServerForm } from "@/app/[orgSlug]/mcps/_components/ServerCard/_hooks/useCreateServerForm";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";

// 名前からslugを生成（日本語などの非ASCII文字はフォールバックでタイムスタンプ生成）
const generateSlugFromName = (name: string): string => {
  const normalized = normalizeSlug(name);
  return normalized || `mcp-${Date.now().toString(36)}`;
};

type RemoteMcpServerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
};

export const RemoteMcpServerModal = ({
  open,
  onOpenChange,
  orgSlug: _orgSlug,
}: RemoteMcpServerModalProps) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transportType, setTransportType] =
    useState<TransportType>("STREAMABLE_HTTPS");
  const [authMethod, setAuthMethod] = useState<"oauth" | "apikey" | "none">(
    "oauth",
  );
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  // v2 APIを使用したサーバー作成フック
  const { isPending, handleOAuthConnect, handleAddWithApiKey } =
    useCreateServerForm({
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });

  const resetForm = () => {
    setName("");
    setUrl("");
    setTransportType("STREAMABLE_HTTPS");
    setAuthMethod("oauth");
    setClientId("");
    setClientSecret("");
    setEnvVars({});
    setNewEnvKey("");
    setNewEnvValue("");
  };

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

    const slug = generateSlugFromName(name.trim());

    if (authMethod === "oauth") {
      // Client IDとClient Secretの整合性チェック
      if (
        (clientId.trim() && !clientSecret.trim()) ||
        (!clientId.trim() && clientSecret.trim())
      ) {
        toast.error(
          "Client IDとClient Secretは両方入力するか、両方空にしてください",
        );
        return;
      }

      // OAuth認証フロー
      handleOAuthConnect({
        serverName: name.trim(),
        slug,
        customUrl: url.trim(),
        transportType,
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
      });
    } else if (authMethod === "apikey") {
      // APIキー認証フロー
      if (Object.keys(envVars).length === 0) {
        toast.error("API_KEY認証を使用する場合、環境変数を追加してください");
        return;
      }
      handleAddWithApiKey({
        serverName: name.trim(),
        slug,
        authType: "API_KEY",
        customUrl: url.trim(),
        transportType,
        envVars,
      });
    } else {
      // NONE認証フロー
      handleAddWithApiKey({
        serverName: name.trim(),
        slug,
        authType: "NONE",
        customUrl: url.trim(),
        transportType,
      });
    }
  };

  const isFormValid = () => {
    if (!name.trim() || !url.trim()) return false;
    if (authMethod === "apikey" && Object.keys(envVars).length === 0)
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
                  {authMethod === "oauth"
                    ? "OAuth認証を開始中..."
                    : "サーバーを作成中..."}
                </span>
              </div>
            </div>
          )}

          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              リモートMCPサーバーの追加
            </DialogTitle>
            <DialogDescription>
              URLからMCPサーバーを追加します。サーバー情報を入力してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Server Name */}
            <div className="mt-2 space-y-2">
              <Label htmlFor="server-name">
                <span>
                  サーバー名<span className="text-red-500">*</span>
                </span>
              </Label>
              <Input
                id="server-name"
                placeholder="例: My Custom MCP Server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                表示されるサーバー名を設定できます（空白や大文字を含むことができます）
              </p>
              <div className="bg-muted rounded-md px-3 py-2">
                <p className="text-muted-foreground text-xs font-medium">
                  MCPサーバー識別子
                </p>
                <p className="font-mono text-sm">{normalizeServerName(name)}</p>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="server-url">
                <span>
                  サーバーURL<span className="text-red-500">*</span>
                </span>
              </Label>
              <Input
                id="server-url"
                type="url"
                placeholder="例: https://example.com/mcp"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Auth Method and Transport Type (横並び) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Auth Method (左側) */}
              <div className="space-y-2">
                <Label htmlFor="auth-method">
                  <span>
                    認証タイプ<span className="text-red-500">*</span>
                  </span>
                </Label>
                <Select
                  value={authMethod}
                  onValueChange={(value) =>
                    setAuthMethod(value as "oauth" | "apikey" | "none")
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="auth-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oauth">OAuth認証</SelectItem>
                    <SelectItem value="apikey">APIキー認証</SelectItem>
                    <SelectItem value="none">認証なし</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transport Type (右側) */}
              <div className="space-y-2">
                <Label htmlFor="transport-type">
                  <span>
                    通信方式<span className="text-red-500">*</span>
                  </span>
                </Label>
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
                      Streamable HTTP
                    </SelectItem>
                    <SelectItem value="SSE">SSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 認証タイプの説明文 */}
            <p className="-mt-2 mb-4 text-xs text-gray-500">
              {authMethod === "oauth" && "OAuth認証を設定します"}
              {authMethod === "apikey" && "APIキーをヘッダーとして送信します"}
              {authMethod === "none" && "認証なしで接続します"}
            </p>

            {/* OAuth詳細設定アコーディオン（OAuth認証の場合のみ） */}
            {authMethod === "oauth" && (
              <Accordion type="single" collapsible className="-mt-2 w-full">
                <AccordionItem value="oauth-credentials">
                  <AccordionTrigger className="text-sm">
                    OAuthクライアント設定
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">
                        手動でOAuth認証を行う場合は、クライアント情報をこちらに入力してください。
                        <br />
                        入力がない場合は自動的にDynamic Client Registration
                        (DCR)を実行します。
                      </p>

                      {/* Client ID */}
                      <div className="space-y-2">
                        <Label htmlFor="client-id">Client ID</Label>
                        <Input
                          id="client-id"
                          placeholder="例: abc123xyz..."
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          disabled={isPending}
                        />
                      </div>

                      {/* Client Secret */}
                      <div className="space-y-2">
                        <Label htmlFor="client-secret">Client Secret</Label>
                        <Input
                          id="client-secret"
                          type="password"
                          placeholder="例: secret123..."
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          disabled={isPending}
                        />
                        <p className="text-xs text-gray-500">
                          Client Secretは安全に暗号化されて保存されます
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Environment Variables (APIキーの場合のみ) */}
            {authMethod === "apikey" && (
              <div className="space-y-3">
                <Label>
                  <span>
                    環境変数<span className="text-red-500">*</span>
                  </span>
                </Label>

                {/* Add new env var */}
                <div className="flex gap-2">
                  <Input
                    placeholder="キー名 (例: Authorization)"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Input
                    type="password"
                    placeholder="値"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
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
                    {Object.entries(envVars).map(([key]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2"
                      >
                        <code className="flex-1 font-mono text-sm">
                          {key}: ****
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

                {Object.keys(envVars).length === 0 && (
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
                  {authMethod === "oauth" ? "OAuth認証開始中..." : "作成中..."}
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
