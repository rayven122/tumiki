"use client";

import { useState } from "react";
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
import { CheckCircle, XCircle, Clock, Loader2, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { AgentId } from "@/schema/ids";
import { ExecutionHistoryModal } from "./ExecutionHistoryModal";

type ExecutionHistoryProps = {
  agentId: AgentId;
  /** 組織スラッグ（チャットページ遷移用） */
  orgSlug: string;
};

/** 選択された実行履歴の型 */
type SelectedExecution = {
  success: boolean;
  executionId: string;
  output: string;
  durationMs: number;
  chatId?: string;
  error?: string;
};

/** 実行時間をフォーマット */
const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}秒`;
};

/** ステータスバッジ */
const StatusBadge = ({ success }: { success: boolean }) =>
  success ? (
    <Badge
      variant="default"
      className="bg-green-100 text-green-700 hover:bg-green-100"
    >
      <CheckCircle className="mr-1 h-3 w-3" />
      成功
    </Badge>
  ) : (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      失敗
    </Badge>
  );

export const ExecutionHistory = ({
  agentId,
  orgSlug,
}: ExecutionHistoryProps) => {
  const [selectedExecution, setSelectedExecution] =
    useState<SelectedExecution | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.agentExecution.findByAgentId.useInfiniteQuery(
      { agentId, limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const handleViewExecution = (execution: {
    id: string;
    chatId: string | null;
    success: boolean;
    durationMs: number | null;
  }) => {
    setSelectedExecution({
      success: execution.success,
      executionId: execution.id,
      output: "",
      durationMs: execution.durationMs ?? 0,
      chatId: execution.chatId ?? undefined,
      error: execution.success ? undefined : "実行に失敗しました",
    });
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-gray-500">実行履歴がありません</p>
        <p className="text-sm text-gray-400">
          スケジュールが実行されると、ここに履歴が表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>実行日時</TableHead>
            <TableHead>スケジュール名</TableHead>
            <TableHead>モデル</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">実行時間</TableHead>
            <TableHead className="w-[100px] text-center">詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allItems.map((execution) => (
            <TableRow key={execution.id}>
              <TableCell className="text-muted-foreground">
                {format(new Date(execution.createdAt), "yyyy/MM/dd HH:mm:ss", {
                  locale: ja,
                })}
              </TableCell>
              <TableCell className="font-medium">
                {execution.scheduleName ?? "手動実行"}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {execution.modelId ?? "-"}
              </TableCell>
              <TableCell>
                <StatusBadge success={execution.success} />
              </TableCell>
              <TableCell className="text-muted-foreground text-right">
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

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            もっと見る
          </Button>
        </div>
      )}

      <ExecutionHistoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        result={selectedExecution}
        orgSlug={orgSlug}
      />
    </div>
  );
};
