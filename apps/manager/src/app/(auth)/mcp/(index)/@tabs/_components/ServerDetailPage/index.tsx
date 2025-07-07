"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Settings,
  Play,
  Square,
  RefreshCw,
  Copy,
  Activity,
  Clock,
  Server,
  Code,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api } from "@/trpc/react";
import { ServerStatus } from "@tumiki/db/prisma";

type ServerDetailPageProps = {
  instanceId: string;
};

export const ServerDetailPage = ({ instanceId }: ServerDetailPageProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [collapsedSections, setCollapsedSections] = useState({
    claude: true,
    cursor: true,
    vscode: true,
    http: true,
  });

  const { data: instance, isLoading } =
    api.userMcpServerInstance.findById.useQuery(
      { id: instanceId },
      { enabled: !!instanceId },
    );

  // リクエストログの統計情報を取得
  const { data: requestStats } =
    api.userMcpServerInstance.getRequestStats.useQuery(
      { instanceId },
      { enabled: !!instanceId },
    );

  // リクエストログ一覧を取得
  const { data: requestLogs, refetch: refetchLogs } =
    api.userMcpServerInstance.findRequestLogs.useQuery(
      { instanceId },
      { enabled: !!instanceId },
    );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              サーバーが見つかりません
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ServerStatus.STOPPED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case ServerStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ServerStatus) => {
    const variants = {
      [ServerStatus.RUNNING]: "default",
      [ServerStatus.STOPPED]: "secondary",
      [ServerStatus.ERROR]: "destructive",
    } as const;

    const labels = {
      [ServerStatus.RUNNING]: "実行中",
      [ServerStatus.STOPPED]: "停止中",
      [ServerStatus.ERROR]: "エラー",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {getStatusIcon(status)}
        <span className="ml-1">{labels[status] || status}</span>
      </Badge>
    );
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <header className="mb-6 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{instance.name}</h1>
        </header>

        {/* Server Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-gray-100">
                  <Server className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(instance.serverStatus)}
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        設定
                      </Button>
                      <Button
                        variant={
                          instance.serverStatus === ServerStatus.RUNNING
                            ? "destructive"
                            : "default"
                        }
                        size="sm"
                      >
                        {instance.serverStatus === ServerStatus.RUNNING ? (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            停止
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            開始
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-gray-600">
                    {instance.description || "MCPサーバーインスタンス"}
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      作成日:{" "}
                      {new Date(instance.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                    <span>
                      最終更新:{" "}
                      {new Date(instance.updatedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-2">
                  {/* {instance.serverType === "" ? "公式" : "カスタム"} */}
                </Badge>
                <div className="text-sm text-gray-500">
                  <div>接続タイプ: SSE</div>
                  <div>可視性: 公開</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="connection">接続情報</TabsTrigger>
            <TabsTrigger value="logs-analytics">ログ・分析</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    リクエスト統計
                  </CardTitle>
                  <Activity className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        今日のリクエスト:
                      </span>
                      <span className="text-sm font-semibold">
                        {requestStats?.todayRequests ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">成功率:</span>
                      <span className="text-sm font-semibold text-green-600">
                        {requestStats?.successRate ?? 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        平均応答時間:
                      </span>
                      <span className="text-sm font-semibold">
                        {requestStats?.avgDuration ?? 0}ms
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    サーバー情報
                  </CardTitle>
                  <Server className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">サーバーID:</span>
                      <span className="font-mono text-sm font-semibold">
                        {instance.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        ツールグループ:
                      </span>
                      <span className="text-sm font-semibold">
                        {instance.toolGroup?.name ?? "未設定"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        利用可能ツール:
                      </span>
                      <span className="text-sm font-semibold">
                        {instance.toolGroup?.toolGroupTools?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    接続統計
                  </CardTitle>
                  <CheckCircle className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        総リクエスト数:
                      </span>
                      <span className="text-sm font-semibold">
                        {requestStats?.totalRequests ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">エラー数:</span>
                      <span className="text-sm font-semibold text-red-600">
                        {requestStats?.totalErrors ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">接続状態:</span>
                      <span className="text-sm font-semibold text-green-600">
                        正常
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ツール情報 */}
            {instance.toolGroup?.toolGroupTools &&
              instance.toolGroup.toolGroupTools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>利用可能なツール</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ツール名</TableHead>
                          <TableHead>説明</TableHead>
                          <TableHead>利用回数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instance.toolGroup.toolGroupTools.map(
                          (toolGroupTool) => (
                            <TableRow key={toolGroupTool.tool.id}>
                              <TableCell className="font-mono text-sm">
                                {toolGroupTool.tool.name}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {toolGroupTool.tool.description || "-"}
                              </TableCell>
                              <TableCell>-</TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">接続設定</h2>
            </div>

            <div className="grid gap-6">
              {/* Claude Desktop */}
              <Card>
                <CardHeader>
                  <Collapsible
                    open={!collapsedSections.claude}
                    onOpenChange={() => toggleSection("claude")}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                            <Code className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <CardTitle>Claude Desktop</CardTitle>
                            <p className="text-sm text-gray-600">
                              claude_desktop_config.json に追加
                            </p>
                          </div>
                        </div>
                        {collapsedSections.claude ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="rounded-lg bg-gray-50 p-4">
                            <pre className="overflow-x-auto text-sm">
                              {`{
  "mcpServers": {
    "${instance.name}": {
      "url": "https://server.tumiki.cloud/sse/${instance.id}"
    }
  }
}`}
                            </pre>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            設定をコピー
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>

              {/* HTTP API */}
              <Card>
                <CardHeader>
                  <Collapsible
                    open={!collapsedSections.http}
                    onOpenChange={() => toggleSection("http")}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                            <Server className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle>HTTP API</CardTitle>
                            <p className="text-sm text-gray-600">
                              直接HTTP接続用
                            </p>
                          </div>
                        </div>
                        {collapsedSections.http ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-600">
                                SSE Endpoint
                              </label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={`https://server.tumiki.cloud/sse/${instance.id}`}
                                  readOnly
                                  className="font-mono text-sm"
                                />
                                <Button variant="outline" size="sm">
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">
                                HTTP Endpoint
                              </label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={`https://server.tumiki.cloud/mcp/${instance.id}`}
                                  readOnly
                                  className="font-mono text-sm"
                                />
                                <Button variant="outline" size="sm">
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs-analytics" className="space-y-6">
            {/* ログセクション */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">リクエストログ</h2>
                <Button variant="outline" onClick={() => refetchLogs()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  更新
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  {requestLogs && requestLogs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>時刻</TableHead>
                          <TableHead>ツール名</TableHead>
                          <TableHead>メソッド</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead>実行時間</TableHead>
                          <TableHead>データサイズ</TableHead>
                          <TableHead>エラー</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requestLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span>
                                  {new Date(log.createdAt).toLocaleString(
                                    "ja-JP",
                                    {
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.toolName || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {log.method || "tools/call"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.responseStatus?.toString().startsWith("2")
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {log.responseStatus || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.durationMs ?? 0}ms</TableCell>
                            <TableCell className="text-xs">
                              <div>↑ {log.inputBytes ?? 0}B</div>
                              <div>↓ {log.outputBytes ?? 0}B</div>
                            </TableCell>
                            <TableCell>
                              {log.errorMessage ? (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {log.errorMessage}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      リクエストログがありません
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 分析セクション */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">分析・統計</h2>
                <Select defaultValue="7days">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1day">1日</SelectItem>
                    <SelectItem value="7days">7日</SelectItem>
                    <SelectItem value="30days">30日</SelectItem>
                    <SelectItem value="90days">90日</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      総リクエスト数
                    </CardTitle>
                    <Activity className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {requestStats?.totalRequests ?? 0}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      今週のリクエスト数
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      成功率
                    </CardTitle>
                    <CheckCircle className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {requestStats?.successRate ?? 0}%
                    </div>
                    <p className="text-muted-foreground text-xs">
                      正常完了したリクエスト
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      平均応答時間
                    </CardTitle>
                    <Clock className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {requestStats?.avgDuration ?? 0}ms
                    </div>
                    <p className="text-muted-foreground text-xs">
                      平均処理時間
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      エラー率
                    </CardTitle>
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {100 - (requestStats?.successRate ?? 100)}%
                    </div>
                    <p className="text-muted-foreground text-xs">
                      失敗したリクエスト
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* リクエスト推移チャート */}
              <Card>
                <CardHeader>
                  <CardTitle>リクエスト推移</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 p-4">
                    {requestLogs && requestLogs.length > 0 ? (
                      <div className="flex h-full items-end justify-between space-x-2">
                        {/* 簡易チャート表示（実際のデータベースから取得） */}
                        <div className="w-full self-center text-center text-gray-500">
                          <p>チャート機能は今後実装予定です</p>
                          <p className="mt-1 text-xs">
                            現在 {requestLogs.length} 件のログがあります
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center self-center text-center text-gray-500">
                        <p>データがありません</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
