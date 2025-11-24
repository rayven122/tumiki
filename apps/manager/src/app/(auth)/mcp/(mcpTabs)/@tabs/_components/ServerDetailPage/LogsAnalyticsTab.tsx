"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import type { RequestStats, RequestLogs } from "./types";
import { RequestDataDetailModal } from "./RequestDataDetailModal";
import { formatDataSize } from "@/utils/formatters";

type LogsAnalyticsTabProps = {
  requestStats: RequestStats;
  requestLogs: RequestLogs;
  refetchLogs: () => void;
};

export const LogsAnalyticsTab = ({
  requestStats,
  requestLogs,
  refetchLogs,
}: LogsAnalyticsTabProps) => {
  const [selectedRequestLogId, setSelectedRequestLogId] = useState<
    string | null
  >(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetail = (requestLogId: string) => {
    setSelectedRequestLogId(requestLogId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRequestLogId(null);
  };

  return (
    <div className="space-y-6">
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
                    <TableHead>詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>
                            {new Date(log.createdAt).toLocaleString("ja-JP", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
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
                            log.httpStatus?.toString().startsWith("2")
                              ? "default"
                              : "destructive"
                          }
                        >
                          {log.httpStatus || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.durationMs ?? 0}ms</TableCell>
                      <TableCell className="text-xs">
                        <div>↑ {formatDataSize(log.inputBytes ?? 0)}</div>
                        <div>↓ {formatDataSize(log.outputBytes ?? 0)}</div>
                      </TableCell>
                      <TableCell>
                        {log.httpStatus && !log.httpStatus.toString().startsWith("2") ? (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(log.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">詳細を表示</span>
                        </Button>
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
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
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
              <p className="text-muted-foreground text-xs">平均処理時間</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">エラー率</CardTitle>
              <AlertCircle className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requestStats?.totalRequests === 0 ||
                requestStats?.successRate === 100
                  ? "-"
                  : `${100 - (requestStats?.successRate ?? 100)}%`}
              </div>
              <p className="text-muted-foreground text-xs">
                失敗したリクエスト
              </p>
            </CardContent>
          </Card>
        </div>

        {/* リクエスト推移チャート */}
        <Card className="mt-6">
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

      {/* リクエスト詳細データ表示モーダル */}
      <RequestDataDetailModal
        requestLogId={selectedRequestLogId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};
