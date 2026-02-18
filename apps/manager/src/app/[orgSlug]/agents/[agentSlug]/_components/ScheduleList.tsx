"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Play,
  Pause,
  Trash2,
  Edit2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { AgentId } from "@/schema/ids";
import { ScheduleForm } from "./ScheduleForm";
import { cronToJapanese } from "./cronUtils";

type ScheduleListProps = {
  agentId: AgentId;
};

/** スケジュールステータス型 */
type ScheduleStatus = "ACTIVE" | "PAUSED" | "DISABLED";

/** ステータスごとのバッジ情報 */
type StatusInfo = {
  variant: "default" | "secondary" | "outline";
  label: string;
  icon: LucideIcon;
};

/** ステータスに応じたバッジスタイル */
const STATUS_STYLES: Record<ScheduleStatus, StatusInfo> = {
  ACTIVE: { variant: "default", label: "有効", icon: Play },
  PAUSED: { variant: "secondary", label: "一時停止", icon: Pause },
  DISABLED: { variant: "outline", label: "無効", icon: Pause },
};

export const ScheduleList = ({ agentId }: ScheduleListProps) => {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  const utils = api.useUtils();

  // スケジュール一覧を取得
  const { data: schedules, isLoading } =
    api.agentSchedule.findByAgentId.useQuery({ agentId });

  // 削除ミューテーション
  const deleteMutation = api.agentSchedule.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`「${data.name}」を削除しました`);
      void utils.agentSchedule.findByAgentId.invalidate({ agentId });
      void utils.agent.findById.invalidate({ id: agentId });
      setDeleteTargetId(null);
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  // 有効/無効切り替えミューテーション
  const toggleMutation = api.agentSchedule.toggle.useMutation({
    onSuccess: () => {
      void utils.agentSchedule.findByAgentId.invalidate({ agentId });
      void utils.agent.findById.invalidate({ id: agentId });
    },
    onError: (error) => {
      toast.error(`ステータス変更に失敗しました: ${error.message}`);
    },
  });

  const handleToggle = (id: string, currentStatus: ScheduleStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    toggleMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate({ id: deleteTargetId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-gray-500">スケジュールがありません</p>
        <p className="text-sm text-gray-400">
          新規スケジュールを作成してください
        </p>
      </div>
    );
  }

  // 編集対象のスケジュールデータ
  const editTargetSchedule = editTargetId
    ? schedules.find((s) => s.id === editTargetId)
    : null;

  return (
    <>
      <div className="space-y-3">
        {schedules.map((schedule) => {
          const statusInfo = STATUS_STYLES[schedule.status];
          const StatusIcon = statusInfo.icon;

          return (
            <div
              key={schedule.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{schedule.name}</span>
                    <Badge variant={statusInfo.variant}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>{cronToJapanese(schedule.cronExpression)}</span>
                    <span>実行回数: {schedule._count.executionLogs}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditTargetId(schedule.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(schedule.id, schedule.status)}
                  disabled={toggleMutation.isPending}
                >
                  {schedule.status === "ACTIVE" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTargetId(schedule.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={() => setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スケジュールを削除</AlertDialogTitle>
            <AlertDialogDescription>
              このスケジュールを削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "削除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 編集フォーム */}
      {editTargetSchedule && (
        <ScheduleForm
          agentId={agentId}
          isOpen={!!editTargetId}
          onClose={() => setEditTargetId(null)}
          editMode
          initialData={{
            id: editTargetSchedule.id,
            name: editTargetSchedule.name,
            cronExpression: editTargetSchedule.cronExpression,
            timezone: editTargetSchedule.timezone,
          }}
        />
      )}
    </>
  );
};
