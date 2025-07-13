"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Settings,
  Play,
  Square,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/trpc/react";
import { ServerStatus } from "@tumiki/db/prisma";
import { OverviewTab } from "./OverviewTab";
import { ConnectionTab } from "./ConnectionTab";
import { LogsAnalyticsTab } from "./LogsAnalyticsTab";

type ServerDetailPageProps = {
  instanceId: string;
};

export const ServerDetailPage = ({ instanceId }: ServerDetailPageProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

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

  const toKebabCase = (str: string) => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  };

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
      <Badge variant={variants[status] ?? "secondary"}>
        {getStatusIcon(status)}
        <span className="ml-1">{labels[status] ?? status}</span>
      </Badge>
    );
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
            <OverviewTab instance={instance} requestStats={requestStats} />
          </TabsContent>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <ConnectionTab instance={instance} toKebabCase={toKebabCase} />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs-analytics" className="space-y-6">
            <LogsAnalyticsTab
              requestStats={requestStats}
              requestLogs={requestLogs}
              refetchLogs={refetchLogs}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
