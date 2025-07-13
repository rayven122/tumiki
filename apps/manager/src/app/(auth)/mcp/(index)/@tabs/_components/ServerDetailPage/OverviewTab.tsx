"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, CheckCircle, Server } from "lucide-react";
import type { UserMcpServerInstance, RequestStats } from "./types";

type OverviewTabProps = {
  instance: UserMcpServerInstance;
  requestStats: RequestStats;
};

export const OverviewTab = ({ instance, requestStats }: OverviewTabProps) => {
  return (
    <div className="space-y-6">
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
                <span className="text-sm text-gray-600">今日のリクエスト:</span>
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
                <span className="text-sm text-gray-600">平均応答時間:</span>
                <span className="text-sm font-semibold">
                  {requestStats?.avgDuration ?? 0}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">サーバー情報</CardTitle>
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
                <span className="text-sm text-gray-600">ツールグループ:</span>
                <span className="text-sm font-semibold">
                  {instance.toolGroup?.name ?? "未設定"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">利用可能ツール:</span>
                <span className="text-sm font-semibold">
                  {instance.toolGroup?.toolGroupTools?.length ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">接続統計</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">総リクエスト数:</span>
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
                  {instance.toolGroup.toolGroupTools.map((toolGroupTool) => (
                    <TableRow key={toolGroupTool.tool.id}>
                      <TableCell className="font-mono text-sm">
                        {toolGroupTool.tool.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {toolGroupTool.tool.description ?? "-"}
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
    </div>
  );
};
