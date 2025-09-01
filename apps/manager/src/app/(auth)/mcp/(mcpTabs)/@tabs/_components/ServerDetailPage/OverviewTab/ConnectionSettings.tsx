"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Copy,
  ArrowLeft,
  ChevronRight,
  FileText,
  Info,
} from "lucide-react";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { toast } from "@/utils/client/toast";
import {
  makeHttpProxyServerUrl,
  makeSseProxyServerUrl,
  getProxyServerUrl,
  normalizeServerName,
} from "@/utils/url";
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

  const getConfigText = (clientId: string, connectionType: "http" | "sse") => {
    const serverUrl = getProxyServerUrl();
    const apiKey = instance.apiKeys?.[0]?.apiKey ?? "YOUR_API_KEY";
    const serverName = normalizeServerName(instance.name);

    // Claude Code - ネイティブサポート
    if (clientId === "claude-code") {
      if (connectionType === "http") {
        return `# Streamable HTTP Transport
claude mcp add --transport streamable-http ${serverName} ${serverUrl}/mcp/${instance.id} --header "x-api-key: ${apiKey}"`;
      } else {
        return `# SSE Transport
claude mcp add --transport sse ${serverName} ${serverUrl}/sse/${instance.id} --header "x-api-key: ${apiKey}"`;
      }
    }

    // Claude Desktop - コネクト機能用のシンプルなURL
    if (clientId === "claude-desktop") {
      const endpoint = connectionType === "http" ? "mcp" : "sse";
      return `${serverUrl}/${endpoint}?api-key=${apiKey}`;
    }

    // Cursor
    if (clientId === "cursor") {
      if (connectionType === "http") {
        return JSON.stringify(
          {
            mcpServers: {
              [serverName]: {
                url: `${serverUrl}/mcp/${instance.id}`,
                transport: "http",
                headers: {
                  "x-api-key": apiKey,
                },
              },
            },
          },
          null,
          2,
        );
      } else {
        // SSE via mcp-remote
        return JSON.stringify(
          {
            mcpServers: {
              [serverName]: {
                command: "npx",
                args: [
                  "-y",
                  "mcp-remote@latest",
                  `${serverUrl}/sse/${instance.id}`,
                  "--header",
                  `x-api-key: ${apiKey}`,
                  "--strategy",
                  "sse-only",
                ],
              },
            },
          },
          null,
          2,
        );
      }
    }

    // VS Code
    if (clientId === "vscode") {
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              url:
                connectionType === "http"
                  ? `${serverUrl}/mcp/${instance.id}`
                  : `${serverUrl}/sse/${instance.id}`,
              transport: connectionType,
              headers: {
                "x-api-key": apiKey,
              },
            },
          },
        },
        null,
        2,
      );
    }

    // Windsurf
    if (clientId === "windsurf") {
      if (connectionType === "http") {
        // HTTP via mcp-remote
        return JSON.stringify(
          {
            mcpServers: {
              [serverName]: {
                command: "npx",
                args: [
                  "-y",
                  "mcp-remote@latest",
                  `${serverUrl}/mcp/${instance.id}`,
                  "--header",
                  `x-api-key: ${apiKey}`,
                  "--strategy",
                  "http-only",
                ],
              },
            },
          },
          null,
          2,
        );
      } else {
        // SSE native support
        return JSON.stringify(
          {
            mcpServers: {
              [serverName]: {
                serverUrl: `${serverUrl}/sse/${instance.id}`,
                headers: {
                  "x-api-key": apiKey,
                },
              },
            },
          },
          null,
          2,
        );
      }
    }

    // Cline
    if (clientId === "cline") {
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              url:
                connectionType === "http"
                  ? `${serverUrl}/mcp/${instance.id}`
                  : `${serverUrl}/sse/${instance.id}`,
              transport: connectionType,
              headers: {
                "x-api-key": apiKey,
              },
              alwaysAllow: [],
              disabled: false,
            },
          },
        },
        null,
        2,
      );
    }

    // その他のクライアント用
    if (connectionType === "http") {
      return `# HTTP接続設定
URL: ${serverUrl}/mcp/${instance.id}
Method: POST
Headers:
  Content-Type: application/json
  x-api-key: ${apiKey}

# mcp-remote経由での接続（stdioクライアント用）
{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "${serverUrl}/mcp/${instance.id}",
        "--header",
        "x-api-key: ${apiKey}",
        "--strategy",
        "http-only"
      ]
    }
  }
}`;
    } else {
      return `# SSE接続設定
URL: ${serverUrl}/sse/${instance.id}
Method: GET (SSE接続)
Headers:
  x-api-key: ${apiKey}

# メッセージ送信エンドポイント
URL: ${serverUrl}/messages/${instance.id}
Method: POST
Headers:
  Content-Type: application/json
  x-api-key: ${apiKey}

# mcp-remote経由での接続（stdioクライアント用）
{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "${serverUrl}/sse/${instance.id}",
        "--header",
        "x-api-key: ${apiKey}",
        "--strategy",
        "sse-only"
      ]
    }
  }
}`;
    }
  };

  const getConfigFilePath = (clientId: string) => {
    switch (clientId) {
      case "claude-desktop":
        return "Claude Desktopのコネクト機能でURLを直接貼り付け";
      case "claude-code":
        return "コマンドラインで直接実行";
      case "cursor":
        return ".cursor/mcp.json (プロジェクト)\n~/.cursor/mcp.json (グローバル)";
      case "vscode":
        return ".vscode/mcp.json (プロジェクト)";
      case "windsurf":
        return "~/.codeium/windsurf/mcp_config.json";
      case "cline":
        return "VS Code内: 設定 > Cline MCP Settings";
      default:
        return "クライアントのドキュメントを参照してください";
    }
  };

  const handleCopyConfig = async (connectionType: "http" | "sse") => {
    if (!selectedClient) return;

    const textToCopy = getConfigText(selectedClient, connectionType);
    await copyToClipboard(textToCopy);
    toast.success(
      selectedClient === "claude-code"
        ? `${connectionType.toUpperCase()}接続コマンドをコピーしました`
        : selectedClient === "claude-desktop"
        ? `${connectionType.toUpperCase()}接続URLをコピーしました`
        : `${connectionType.toUpperCase()}接続設定をコピーしました`,
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
                        src={`/logos/clients/${client?.id}.svg`}
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
              {/* 設定ファイルパス表示 */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start space-x-2">
                  <FileText className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {selectedClient === "claude-desktop" ? "接続方法:" : "設定ファイルの場所:"}
                    </p>
                    <p className="mt-1 text-xs whitespace-pre-wrap text-blue-700">
                      {getConfigFilePath(selectedClient)}
                    </p>
                  </div>
                </div>
              </div>

              {/* HTTP/SSE接続タブ */}
              <Tabs defaultValue="http" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="http">HTTP接続</TabsTrigger>
                  <TabsTrigger value="sse">SSE接続</TabsTrigger>
                </TabsList>

                <TabsContent value="http" className="space-y-3">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <pre className="m-0 overflow-x-auto bg-transparent p-0 text-sm">
                          <code className="whitespace-pre">
                            {getConfigText(selectedClient, "http")}
                          </code>
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={() => handleCopyConfig("http")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {selectedClient === "claude-desktop" && (
                    <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <Info className="mt-0.5 h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-xs text-blue-800">
                          <span className="font-medium">コネクト機能:</span>{" "}
                          このURLをClaude Desktopのコネクト機能に直接貼り付けてください。
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedClient === "windsurf" && (
                    <div className="flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <Info className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-800">
                          <span className="font-medium">mcp-remote使用:</span>{" "}
                          このクライアントはstdio
                          transportのみサポートするため、mcp-remoteを使用してHTTP接続を行います。
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sse" className="space-y-3">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <pre className="m-0 overflow-x-auto bg-transparent p-0 text-sm">
                          <code className="whitespace-pre">
                            {getConfigText(selectedClient, "sse")}
                          </code>
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={() => handleCopyConfig("sse")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {selectedClient === "claude-desktop" && (
                    <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <Info className="mt-0.5 h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-xs text-blue-800">
                          <span className="font-medium">コネクト機能:</span>{" "}
                          このURLをClaude Desktopのコネクト機能に直接貼り付けてください。
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedClient === "cursor" && (
                    <div className="flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <Info className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-800">
                          <span className="font-medium">mcp-remote使用:</span>{" "}
                          このクライアントはSSE接続にmcp-remoteを使用します。
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* 追加情報 */}
              {selectedClient === "claude-code" && (
                <p className="text-xs text-gray-600">
                  ※ Streamable HTTP transportが推奨です。SSE
                  transportは代替オプションとしてご利用ください。
                </p>
              )}
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
                              src={`/logos/clients/${client.id}.svg`}
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
          <CardTitle className="text-base">接続エンドポイント</CardTitle>
          <p className="mt-1 text-sm text-gray-600">
            ProxyServer経由でMCPサーバーに接続するためのエンドポイントとAPI認証情報です
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  Streamable HTTP Transport (推奨)
                </p>
                <div className="overflow-x-auto">
                  <code className="text-sm whitespace-nowrap">
                    {makeHttpProxyServerUrl(instance.id)}
                  </code>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  メソッド: POST | ヘッダー: x-api-key: {apiKey}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  JSON-RPC 2.0形式でリクエストを送信
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
                onClick={async () => {
                  const configText = `# Streamable HTTP Transport (推奨)
URL: ${makeHttpProxyServerUrl(instance.id)}
Method: POST
Headers:
  Content-Type: application/json
  x-api-key: ${apiKey}

# JSON-RPC 2.0 リクエスト例
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}`;
                  await copyToClipboard(configText);
                  toast.success("Streamable HTTP設定をコピーしました");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  SSE Transport (リアルタイム通信)
                </p>
                <div className="overflow-x-auto">
                  <code className="text-sm whitespace-nowrap">
                    {makeSseProxyServerUrl(instance.id)}
                  </code>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  メソッド: GET (SSE接続) | ヘッダー: x-api-key: {apiKey}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  メッセージ送信: POST {getProxyServerUrl()}/messages/
                  {instance.id}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
                onClick={async () => {
                  const configText = `# SSE Transport (リアルタイム通信)
SSE接続URL: ${makeSseProxyServerUrl(instance.id)}
Method: GET
Headers:
  x-api-key: ${apiKey}

# メッセージ送信
URL: ${getProxyServerUrl()}/messages/${instance.id}
Method: POST
Headers:
  Content-Type: application/json
  x-api-key: ${apiKey}`;
                  await copyToClipboard(configText);
                  toast.success("SSE設定をコピーしました");
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
