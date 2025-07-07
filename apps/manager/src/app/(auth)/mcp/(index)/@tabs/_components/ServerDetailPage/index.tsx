"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { api } from "@/trpc/react";

type ServerDetailPageProps = {
  instanceId: string;
};

export const ServerDetailPage = ({ instanceId }: ServerDetailPageProps) => {
  const router = useRouter();

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{instance.name}</h1>
            <p className="text-gray-600">{instance.description}</p>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              サーバーステータス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(instance.serverStatus)}>
              {instance.serverStatus}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総リクエスト数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requestStats?.totalRequests ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">
              今日: {requestStats?.todayRequests ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requestStats?.successRate ?? 0}%
            </div>
            <p className="text-muted-foreground text-xs">
              エラー: {requestStats?.totalErrors ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">作成日</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(instance.createdAt).toLocaleDateString("ja-JP")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>サーバー詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="font-medium">サーバーID:</span> {instance.id}
            </div>
            <div>
              <span className="font-medium">ツールグループ:</span>{" "}
              {instance.toolGroup?.name ?? "未設定"}
            </div>
            <div>
              <span className="font-medium">利用可能ツール数:</span>{" "}
              {instance.toolGroup?.toolGroupTools?.length ?? 0}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      {instance.toolGroup?.toolGroupTools &&
        instance.toolGroup.toolGroupTools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>利用可能ツール</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {instance.toolGroup.toolGroupTools.map((toolGroupTool) => (
                  <div
                    key={toolGroupTool.tool.id}
                    className="border-l-4 border-blue-500 bg-blue-50 p-4"
                  >
                    <h4 className="font-medium">{toolGroupTool.tool.name}</h4>
                    {toolGroupTool.tool.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {toolGroupTool.tool.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};
