"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, ArrowLeft, ChevronRight } from "lucide-react";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { toast } from "@/utils/client/toast";
import { makeHttpProxyServerUrl, makeSseProxyServerUrl } from "@/utils/url";
import Image from "next/image";
import type { UserMcpServerInstance } from "../types";

const ALL_CLIENTS = [
  { id: "claude-desktop", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  // { id: "vscode-insiders", name: "VS Code Insiders" },
  { id: "windsurf", name: "Windsurf" },
  { id: "cline", name: "Cline" },
  { id: "raycast", name: "Raycast" },
  { id: "gemini-cli", name: "Gemini CLI" },
  { id: "roo-code", name: "Roo Code" },
  // { id: "augment", name: "Augment" },
  { id: "bolt-ai", name: "BoltAI" },
  { id: "amazon-bedrock", name: "Amazon Bedrock" },
  { id: "amazon-q", name: "Amazon Q" },
];

type ConnectionSettingsProps = {
  instance: UserMcpServerInstance;
};

export const ConnectionSettings = ({ instance }: ConnectionSettingsProps) => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const apiKey = instance.apiKeys?.[0]?.apiKey ?? "";

  const getConfigText = (clientId: string) => {
    if (clientId === "claude-code") {
      return `claude mcp add --transport sse ${instance.name.toLowerCase().replace(/\s+/g, "-")} https://server.tumiki.cloud/sse --header "api-key: ${instance.apiKeys?.[0]?.apiKey ?? "YOUR_API_KEY"}"`;
    }

    const config = {
      mcpServers: {
        [instance.name]: {
          command: "node",
          args: [instance.mcpServerUrl],
          env: {
            API_KEY: instance.apiKeys?.[0]?.apiKey ?? "YOUR_API_KEY",
          },
        },
      },
    };
    return JSON.stringify(config, null, 2);
  };

  const handleCopyConfig = async () => {
    if (!selectedClient) return;

    const textToCopy = getConfigText(selectedClient);
    await copyToClipboard(textToCopy);
    toast.success(
      selectedClient === "claude-code"
        ? "コマンドをコピーしました"
        : "設定をコピーしました",
    );
  };

  return (
    <div className="space-y-4 lg:col-span-2">
      <h3 className="text-lg font-semibold">接続設定</h3>
      {/* クライアント接続 カード */}
      <Card>
        {selectedClient ? (
          // 選択されたクライアントの詳細表示
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedClient(null)}
                  className="flex items-center space-x-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>戻る</span>
                </Button>
              </div>
              {(() => {
                const client = ALL_CLIENTS.find((c) => c.id === selectedClient);
                return (
                  <div className="mt-4 flex items-center space-x-3">
                    <div className="relative h-8 w-8">
                      <Image
                        src={`/logos/clients/${client?.id}.webp`}
                        alt={client?.name ?? ""}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{client?.name}</h3>
                      <p className="text-sm text-gray-600">接続設定</p>
                    </div>
                  </div>
                );
              })()}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">
                    {selectedClient === "claude-code"
                      ? "コマンドで追加"
                      : "設定ファイルに追加"}
                  </h4>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <pre className="m-0 overflow-x-auto bg-transparent p-0 text-sm">
                          <code className="whitespace-nowrap">
                            {selectedClient === "claude-code"
                              ? getConfigText("claude-code")
                              : getConfigText(selectedClient)}
                          </code>
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={handleCopyConfig}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          // クライアント一覧表示
          <>
            <CardHeader>
              <CardTitle className="text-base">クライアント接続</CardTitle>
              <p className="mt-1 text-sm text-gray-600">
                このMCPサーバーを接続したいAIツールを選択してください
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="クライアントを検索..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3 pr-2">
                  {(() => {
                    const filteredClients = ALL_CLIENTS.filter((client) =>
                      client.name
                        .toLowerCase()
                        .includes(clientSearchQuery.toLowerCase()),
                    );

                    if (filteredClients.length === 0) {
                      return (
                        <div className="py-8 text-center text-gray-500">
                          <p className="text-sm">
                            「{clientSearchQuery}
                            」に一致するクライアントが見つかりません
                          </p>
                        </div>
                      );
                    }

                    return filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                        onClick={() => setSelectedClient(client.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative h-6 w-6">
                            <Image
                              src={`/logos/clients/${client.id}.webp`}
                              alt={client.name}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {client.name}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>
      {/* 接続URL カード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">接続URL</CardTitle>
          <p className="mt-1 text-sm text-gray-600">
            MCPサーバーへの接続に使用するURLです
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="mb-1 text-xs text-gray-600">SSE接続</p>
                <div className="overflow-x-auto">
                  <code className="text-sm whitespace-nowrap">
                    {makeSseProxyServerUrl(apiKey)}
                  </code>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
                onClick={async () => {
                  await copyToClipboard(makeSseProxyServerUrl(apiKey));
                  toast.success("SSE URLをコピーしました");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="mb-1 text-xs text-gray-600">HTTP接続</p>
                <div className="overflow-x-auto">
                  <code className="text-sm whitespace-nowrap">
                    {makeHttpProxyServerUrl(apiKey)}
                  </code>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
                onClick={async () => {
                  await copyToClipboard(makeHttpProxyServerUrl(apiKey));
                  toast.success("HTTP URLをコピーしました");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
