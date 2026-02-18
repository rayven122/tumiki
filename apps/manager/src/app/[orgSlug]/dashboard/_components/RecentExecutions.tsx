"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Activity, CheckCircle, XCircle, Eye } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { EntityIcon } from "@/components/ui/EntityIcon";
import { ExecutionHistoryModal } from "../../agents/[agentSlug]/_components/ExecutionHistoryModal";

type Execution = RouterOutputs["dashboard"]["getRecentExecutions"][number];

type RecentExecutionsProps = {
  executions: Execution[];
  orgSlug: string;
};

/** 実行時間をフォーマット */
const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}秒`;
};

/** ステータスバッジ */
const StatusBadge = ({ success }: { success: boolean | null }) => {
  // 実行中（success === null）
  if (success === null) {
    return (
      <Badge variant="outline" className="text-gray-500">
        <Clock className="mr-1 h-3 w-3" />
        実行中
      </Badge>
    );
  }

  // 成功
  if (success) {
    return (
      <Badge
        variant="default"
        className="bg-green-100 text-green-700 hover:bg-green-100"
      >
        <CheckCircle className="mr-1 h-3 w-3" />
        成功
      </Badge>
    );
  }

  // 失敗
  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      失敗
    </Badge>
  );
};

/** ExecutionHistoryModalに渡す実行結果の型 */
type ExecutionResultForModal = {
  success: boolean;
  executionId: string;
  output: string;
  durationMs: number;
  chatId?: string;
  error?: string;
};

export const RecentExecutions = ({
  executions,
  orgSlug,
}: RecentExecutionsProps) => {
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionResultForModal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleViewExecution = (execution: Execution) => {
    if (!execution.chatId) return;

    setSelectedExecution({
      success: execution.success ?? false,
      executionId: execution.id,
      output: "",
      durationMs: execution.durationMs ?? 0,
      chatId: execution.chatId,
      error: execution.success ? undefined : "実行に失敗しました",
    });
    setModalOpen(true);
  };

  if (executions.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            最近の実行履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
            <Clock className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">まだ実行履歴がありません</p>
            <p className="text-xs">
              エージェントを実行すると、ここに履歴が表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            最近の実行履歴
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">実行日時</TableHead>
                  <TableHead className="min-w-[180px]">エージェント</TableHead>
                  <TableHead className="whitespace-nowrap">トリガー</TableHead>
                  <TableHead className="whitespace-nowrap">モデル</TableHead>
                  <TableHead className="whitespace-nowrap">
                    ステータス
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    実行時間
                  </TableHead>
                  <TableHead className="w-[60px] text-center">詳細</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(
                        new Date(execution.createdAt),
                        "yyyy/MM/dd HH:mm:ss",
                        { locale: ja },
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/${orgSlug}/agents/${execution.agentSlug}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <EntityIcon
                          iconPath={execution.agentIconPath}
                          type="agent"
                          size="sm"
                          alt={execution.agentName}
                        />
                        <span className="font-medium">
                          {execution.agentName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {execution.scheduleName ?? "手動実行"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {execution.modelId ?? "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge success={execution.success} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                      {formatDuration(execution.durationMs)}
                    </TableCell>
                    <TableCell className="text-center">
                      {execution.chatId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewExecution(execution)}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">結果を見る</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ExecutionHistoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        result={selectedExecution}
        orgSlug={orgSlug}
      />
    </>
  );
};
