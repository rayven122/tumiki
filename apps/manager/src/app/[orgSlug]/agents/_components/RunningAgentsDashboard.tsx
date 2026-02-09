"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { ExecutionModalBase } from "../[agentSlug]/_components/ExecutionModalBase";
import { ExecutionMessages } from "../[agentSlug]/_components/ExecutionMessages";

/** ポーリング間隔（1秒 - リアルタイム性向上） */
const POLLING_INTERVAL_MS = 1000;

/** 進捗更新間隔（100ms - スムーズなアニメーション用） */
const PROGRESS_UPDATE_INTERVAL_MS = 100;

/** 警告閾値（90%を超えると警告状態） */
const WARNING_THRESHOLD = 90;

/** 進捗率を計算 */
const calculateProgress = (
  createdAt: Date,
  estimatedDurationMs: number,
): number => {
  const elapsedMs = Date.now() - createdAt.getTime();
  return Math.min((elapsedMs / estimatedDurationMs) * 100, 99);
};

/** 開始時刻をフォーマット（絶対時刻） */
const formatStartTime = (createdAt: Date): string =>
  format(createdAt, "HH:mm:ss");

/** 経過時間をフォーマット（mm:ss形式） */
const formatElapsedTime = (createdAt: Date): string => {
  const elapsedMs = Date.now() - createdAt.getTime();
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/** パルスアニメーション付き円形アイコン */
const PulseCircleIcon = ({ isWarning = false }: { isWarning?: boolean }) => {
  const colorClass = isWarning
    ? "bg-orange-500"
    : "bg-gradient-to-br from-emerald-400 to-emerald-600";
  const pulseColorClass = isWarning ? "bg-orange-400" : "bg-emerald-400";

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      {/* 外側のパルスリング */}
      <span
        className={`absolute h-full w-full animate-ping rounded-full opacity-20 ${pulseColorClass}`}
      />
      {/* 内側のパルスリング */}
      <span
        className={`absolute h-10 w-10 animate-pulse rounded-full opacity-30 ${pulseColorClass}`}
      />
      {/* メインの円 */}
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${colorClass} shadow-lg`}
      >
        <Activity className="h-4 w-4 text-white" />
      </span>
    </div>
  );
};

/** エージェントアイコン */
const AgentIcon = ({
  iconPath,
  name,
}: {
  iconPath: string | null;
  name: string;
}) => {
  if (iconPath) {
    return (
      <Image
        src={iconPath}
        alt={name}
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
      <span className="text-sm font-bold">{name.charAt(0)}</span>
    </div>
  );
};

/** ステータスバッジ */
const StatusBadge = ({
  icon,
  text,
  variant = "default",
}: {
  icon: React.ReactNode;
  text: string;
  variant?: "default" | "success" | "warning";
}) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-orange-50 text-orange-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {icon}
      {text}
    </span>
  );
};

type ExecutionData = {
  id: string;
  chatId: string | null;
  agentName: string;
  agentIconPath: string | null;
  estimatedDurationMs: number;
  createdAt: Date;
};

type AgentActivityCardProps = {
  execution: ExecutionData;
  onViewDetails: (execution: ExecutionData) => void;
};

/** エージェントアクティビティカード（グリッド表示用） */
const AgentActivityCard = ({
  execution,
  onViewDetails,
}: AgentActivityCardProps) => {
  const [progress, setProgress] = useState(() =>
    calculateProgress(execution.createdAt, execution.estimatedDurationMs),
  );
  const [elapsedTime, setElapsedTime] = useState(() =>
    formatElapsedTime(execution.createdAt),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(
        calculateProgress(execution.createdAt, execution.estimatedDurationMs),
      );
      setElapsedTime(formatElapsedTime(execution.createdAt));
    }, PROGRESS_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [execution.createdAt, execution.estimatedDurationMs]);

  const progressPercent = Math.round(progress);
  const isWarning = progressPercent >= WARNING_THRESHOLD;

  // プログレスバーの色
  const progressColorClass = isWarning
    ? "bg-gradient-to-r from-orange-400 to-orange-500"
    : "bg-gradient-to-r from-emerald-400 to-emerald-500";

  // ステータステキスト
  const statusText = isWarning ? "推定時間を超過中..." : "データ処理中...";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
      role="article"
      aria-label={`${execution.agentName}の実行状態`}
    >
      {/* 上部: アイコンと情報 */}
      <div className="mb-4 flex items-start gap-4">
        {/* パルスアニメーション付きアイコン */}
        <PulseCircleIcon isWarning={isWarning} />

        {/* エージェント情報 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AgentIcon
              iconPath={execution.agentIconPath}
              name={execution.agentName}
            />
            <h3 className="truncate text-base font-bold text-gray-900">
              {execution.agentName}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            開始: {formatStartTime(execution.createdAt)}
          </p>
        </div>

        {/* 進捗率 */}
        <div className="text-right">
          <span
            className={`text-2xl font-bold ${isWarning ? "text-orange-600" : "text-emerald-600"}`}
          >
            {progressPercent}%
          </span>
          <p className="text-xs font-medium text-gray-400 tabular-nums">
            {elapsedTime}
          </p>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${progressColorClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ステータス行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isWarning ? (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          )}
          <span>{statusText}</span>
        </div>

        {/* 詳細ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(execution)}
          className="h-8 gap-1.5 px-3 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-700"
        >
          <Eye className="h-4 w-4" />
          <span className="text-xs">詳細</span>
        </Button>
      </div>
    </div>
  );
};

/** リアルタイムログエントリの型 */
type LogEntry = {
  id: string;
  timestamp: string;
  agentSlug: string;
  message: string;
  status: "success" | "warning" | "info";
};

/** リアルタイムログエントリコンポーネント */
const LogEntryItem = ({ entry }: { entry: LogEntry }) => {
  const statusIcon = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    info: <Activity className="h-4 w-4 text-blue-500" />,
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-16 shrink-0 font-mono text-xs text-gray-400">
        {entry.timestamp}
      </span>
      <span className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        {entry.agentSlug}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-gray-600">
        {entry.message}
      </span>
      {statusIcon[entry.status]}
    </div>
  );
};

type ExecutionDetailsModalProps = {
  execution: ExecutionData | null;
  open: boolean;
  onClose: () => void;
};

/** 実行詳細モーダル（チャットUI） */
const ExecutionDetailsModal = ({
  execution,
  open,
  onClose,
}: ExecutionDetailsModalProps) => {
  // メッセージをポーリングで取得
  const { data: messages, isLoading } =
    api.v2.agentExecution.getMessages.useQuery(
      { chatId: execution?.chatId ?? "" },
      {
        enabled: open && !!execution?.chatId,
        refetchInterval: POLLING_INTERVAL_MS,
      },
    );

  if (!execution) return null;

  const titleIcon = <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;

  const metadata = (
    <>
      <span>開始: {formatStartTime(execution.createdAt)}</span>
      <span>|</span>
      <span>経過: {formatElapsedTime(execution.createdAt)}</span>
    </>
  );

  // メッセージをExecutionMessages形式に変換
  const executionMessages = messages?.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
    createdAt: msg.createdAt,
  }));

  return (
    <ExecutionModalBase
      open={open}
      onOpenChange={onClose}
      titleIcon={titleIcon}
      titleText="実行中..."
      metadata={metadata}
    >
      {execution.chatId ? (
        <ExecutionMessages
          messages={executionMessages}
          isLoading={isLoading}
          fallbackOutput=""
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex items-center gap-3">
            <AgentIcon
              iconPath={execution.agentIconPath}
              name={execution.agentName}
            />
            <span className="text-lg font-semibold text-gray-900">
              {execution.agentName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>エージェントが処理中です...</span>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            実行が完了すると、結果がここに表示されます
          </p>
        </div>
      )}
    </ExecutionModalBase>
  );
};

/** 空状態の表示 */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
      <Activity className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-700">
      稼働中のエージェントはありません
    </h3>
    <p className="mt-2 max-w-sm text-sm text-gray-500">
      エージェントの実行を開始すると、ここでリアルタイムの進捗を確認できます。
    </p>
  </div>
);

/** 稼働中エージェントダッシュボード */
export const RunningAgentsDashboard = () => {
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionData | null>(null);

  const { data: runningExecutions } =
    api.v2.agentExecution.getAllRunning.useQuery(undefined, {
      refetchInterval: POLLING_INTERVAL_MS,
    });

  // 統計情報の計算
  const stats = useMemo(() => {
    if (!runningExecutions?.length) {
      return { count: 0, averageProgress: 0 };
    }

    const progressValues = runningExecutions.map((exec) =>
      calculateProgress(new Date(exec.createdAt), exec.estimatedDurationMs),
    );
    const averageProgress = Math.round(
      progressValues.reduce((a, b) => a + b, 0) / progressValues.length,
    );

    return {
      count: runningExecutions.length,
      averageProgress,
    };
  }, [runningExecutions]);

  // リアルタイムログエントリ（実際のメッセージデータから生成）
  const logEntries: LogEntry[] = useMemo(() => {
    if (!runningExecutions?.length) return [];

    return runningExecutions.slice(0, 5).map((exec) => {
      const progress = calculateProgress(
        new Date(exec.createdAt),
        exec.estimatedDurationMs,
      );
      const isWarning = progress >= WARNING_THRESHOLD;

      // ステータスを判定: 警告状態、メッセージあり=成功、メッセージなし=処理中
      const status: "success" | "warning" | "info" = isWarning
        ? "warning"
        : exec.latestMessage
          ? "success"
          : "info";

      // メッセージを決定: 実際のメッセージがあればそれを使用、なければデフォルト
      const message = exec.latestMessage ?? "処理を開始しました...";

      return {
        id: exec.id,
        timestamp: formatStartTime(new Date(exec.createdAt)),
        agentSlug: exec.agentSlug,
        message,
        status,
      };
    });
  }, [runningExecutions]);

  const hasRunningExecutions =
    runningExecutions && runningExecutions.length > 0;

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-sm">
        {/* ヘッダー */}
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                稼働中のエージェント
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                リアルタイム実行モニタリング
              </p>
            </div>

            {/* ステータスバッジ */}
            {hasRunningExecutions && (
              <div className="flex items-center gap-2">
                <StatusBadge
                  icon={
                    <span className="relative flex h-2 w-2">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  }
                  text={`${stats.count} 実行中`}
                  variant="success"
                />
                <StatusBadge
                  icon={<Zap className="h-3.5 w-3.5" />}
                  text={`平均 ${stats.averageProgress}%`}
                  variant="default"
                />
              </div>
            )}
          </div>
        </div>

        {/* コンテンツ */}
        {hasRunningExecutions ? (
          <div className="p-6">
            {/* エージェントカードグリッド */}
            <div className="grid gap-4 sm:grid-cols-2">
              {runningExecutions.map((execution) => (
                <AgentActivityCard
                  key={execution.id}
                  execution={{
                    ...execution,
                    createdAt: new Date(execution.createdAt),
                  }}
                  onViewDetails={setSelectedExecution}
                />
              ))}
            </div>

            {/* リアルタイムログセクション */}
            {logEntries.length > 0 && (
              <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  リアルタイムログ
                </h3>
                <div className="divide-y divide-gray-100">
                  {logEntries.map((entry) => (
                    <LogEntryItem key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* 詳細モーダル */}
      <ExecutionDetailsModal
        execution={selectedExecution}
        open={!!selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </>
  );
};
