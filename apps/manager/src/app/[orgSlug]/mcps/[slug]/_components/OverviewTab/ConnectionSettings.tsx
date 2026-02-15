"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Copy,
  ArrowLeft,
  ChevronRight,
  FileText,
  Info,
  Share2,
  Eye,
  EyeOff,
} from "lucide-react";
import { copyToClipboard } from "@/lib/client/copyToClipboard";
import { toast } from "@/lib/client/toast";
import { getProxyServerUrl, makeHttpProxyServerUrl } from "@/lib/url";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";
import { api } from "@/trpc/react";
import Image from "next/image";
import type { UserMcpServerDetail } from "../types";
import type { McpServerId } from "@/schema/ids";

const ALL_CLIENTS = [
  { id: "claude-desktop", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "windsurf", name: "Windsurf" },
  { id: "cline", name: "Cline" },
  { id: "raycast", name: "Raycast" },
  { id: "gemini-cli", name: "Gemini CLI" },
  { id: "roo-code", name: "Roo Code" },
  { id: "bolt-ai", name: "BoltAI" },
  { id: "amazon-bedrock", name: "Amazon Bedrock" },
  { id: "amazon-q", name: "Amazon Q" },
];

type ConnectionSettingsProps = {
  server: UserMcpServerDetail;
  serverId: McpServerId;
};

export const ConnectionSettings = ({
  server,
  serverId,
}: ConnectionSettingsProps) => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // APIキー一覧取得
  const { data: apiKeys } = api.mcpServerAuth.listApiKeys.useQuery({
    serverId,
  });

  // 有効なAPIキーを選択（無効化されておらず、有効期限内の最新のもの）
  const apiKey = (() => {
    if (!apiKeys || apiKeys.length === 0) return "YOUR_API_KEY";

    const now = new Date();
    const validApiKeys = apiKeys.filter((key) => {
      // 無効化されていないこと
      if (!key.isActive) return false;

      // 有効期限内であること（expiresAtがnullの場合は無期限なのでOK）
      if (key.expiresAt && new Date(key.expiresAt) < now) return false;

      return true;
    });

    // 有効なAPIキーがない場合は "YOUR_API_KEY" を返す
    if (validApiKeys.length === 0) {
      return "YOUR_API_KEY";
    }

    // 最新のものを返す
    return validApiKeys[0]?.apiKey ?? "YOUR_API_KEY";
  })();

  const getConfigText = (clientId: string) => {
    const serverUrl = getProxyServerUrl();
    const serverName = normalizeServerName(server.name);

    // Claude Code - ネイティブサポート
    if (clientId === "claude-code") {
      return `claude mcp add --transport http ${serverName} ${serverUrl}/mcp/${server.slug} --header "tumiki-api-key: ${apiKey}"`;
    }

    // Claude Desktop - コネクト機能用のシンプルなURL
    if (clientId === "claude-desktop") {
      return `${serverUrl}/mcp/${server.slug}`;
    }

    // Cursor
    if (clientId === "cursor") {
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              url: `${serverUrl}/mcp/${server.slug}`,
              transport: "http",
              headers: {
                "tumiki-api-key": apiKey,
              },
            },
          },
        },
        null,
        2,
      );
    }

    // VS Code
    if (clientId === "vscode") {
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              url: `${serverUrl}/mcp/${server.slug}`,
              transport: "http",
              headers: {
                "tumiki-api-key": apiKey,
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
      // HTTP via mcp-remote
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              command: "npx",
              args: [
                "-y",
                "mcp-remote@latest",
                `${serverUrl}/mcp/${server.slug}`,
                "--header",
                `tumiki-api-key: ${apiKey}`,
                "--strategy",
                "http-only",
              ],
            },
          },
        },
        null,
        2,
      );
    }

    // Cline
    if (clientId === "cline") {
      return JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              url: `${serverUrl}/mcp/${server.slug}`,
              transport: "http",
              headers: {
                "tumiki-api-key": apiKey,
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
    return `# HTTP接続設定
URL: ${serverUrl}/mcp/${server.slug}
Method: POST
Headers:
  Content-Type: application/json
  tumiki-api-key: ${apiKey}

# mcp-remote経由での接続（stdioクライアント用）
{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "${serverUrl}/mcp/${server.slug}",
        "--header",
        "tumiki-api-key: ${apiKey}",
        "--strategy",
        "http-only"
      ]
    }
  }
}`;
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

  const handleCopyConfig = async () => {
    if (!selectedClient) return;

    const textToCopy = getConfigText(selectedClient);
    await copyToClipboard(textToCopy);
    toast.success(
      selectedClient === "claude-code"
        ? "接続コマンドをコピーしました"
        : selectedClient === "claude-desktop"
          ? "接続URLをコピーしました"
          : "接続設定をコピーしました",
    );
  };

  return (
    <div id="connection-settings" className="space-y-4">
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
                      {selectedClient === "claude-desktop"
                        ? "接続方法:"
                        : "設定ファイルの場所:"}
                    </p>
                    <p className="mt-1 text-xs whitespace-pre-wrap text-blue-700">
                      {getConfigFilePath(selectedClient)}
                    </p>
                  </div>
                </div>
              </div>

              {/* HTTP接続設定 */}
              <div className="space-y-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <pre className="m-0 overflow-x-auto bg-transparent p-0 text-sm">
                        <code className="whitespace-pre">
                          {showApiKey
                            ? getConfigText(selectedClient)
                            : getConfigText(selectedClient).replace(
                                new RegExp(apiKey, "g"),
                                "•".repeat(20) + "...",
                              )}
                        </code>
                      </pre>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyConfig}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {selectedClient === "claude-desktop" && (
                  <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <Info className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-800">
                        <span className="font-medium">コネクト機能:</span>{" "}
                        このURLをClaude
                        Desktopのコネクト機能に貼り付けてください。
                      </p>
                      <p className="mt-2 text-xs text-blue-800">
                        <span className="font-medium">認証ヘッダー:</span>{" "}
                        Tumiki-API-Key:{" "}
                        {showApiKey ? apiKey : "•".repeat(20) + "..."}
                      </p>
                      <p className="mt-1 text-xs text-blue-700">
                        または Authorization: Bearer{" "}
                        {showApiKey ? apiKey : "•".repeat(20) + "..."}
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
              </div>
            </CardContent>
          </>
        ) : (
          // クライアント一覧表示
          <>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Share2 className="h-5 w-5" />
                <span>クライアント接続</span>
              </CardTitle>
              <p className="mt-1 text-sm text-gray-600">
                このMCPサーバーを接続したいAIツールを選択してください
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 接続URL情報 */}
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold whitespace-nowrap text-gray-700">
                  接続URL
                </p>
                <code className="min-w-0 flex-1 overflow-x-auto text-xs text-gray-600">
                  {makeHttpProxyServerUrl(server.slug)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-shrink-0"
                  onClick={async () => {
                    await copyToClipboard(makeHttpProxyServerUrl(server.slug));
                    toast.success("接続URLをコピーしました");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

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
    </div>
  );
};
