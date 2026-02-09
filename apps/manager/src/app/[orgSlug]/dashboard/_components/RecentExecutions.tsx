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
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Activity } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { McpServerIcon } from "../../mcps/_components/McpServerIcon";

type Execution =
  RouterOutputs["v2"]["dashboard"]["getRecentExecutions"][number];

type RecentExecutionsProps = {
  executions: Execution[];
  orgSlug: string;
};

// ステータスバッジのスタイル定義
const STATUS_BADGE_CLASSES = {
  success: "border-green-200 bg-green-50 text-green-700 shadow-sm",
  failure: "border-red-200 bg-red-50 text-red-700 shadow-sm",
} as const;

// 実行時間を秒単位でフォーマット
const formatDuration = (durationMs: number | null): string | null => {
  if (durationMs === null) return null;
  return (durationMs / 1000).toFixed(1);
};

// カードヘッダー共通コンポーネント
const ExecutionCardHeader = () => (
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-base">
      <Activity className="h-4 w-4" />
      最近の実行履歴
    </CardTitle>
  </CardHeader>
);

// 空状態の表示コンポーネント
const EmptyState = () => (
  <Card className="border-0 shadow-md">
    <ExecutionCardHeader />
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

// 実行時間の表示コンポーネント
type DurationDisplayProps = {
  durationMs: number | null;
};

const DurationDisplay = ({ durationMs }: DurationDisplayProps) => {
  const formattedDuration = formatDuration(durationMs);

  if (formattedDuration === null) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-semibold text-gray-700">{formattedDuration}</span>
      <span className="text-gray-500">秒</span>
    </div>
  );
};

// エージェントアイコンの表示コンポーネント
type AgentIconProps = {
  iconPath: string | null;
  name: string;
};

const AgentIcon = ({ iconPath, name }: AgentIconProps) => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
    {iconPath ? (
      <McpServerIcon iconPath={iconPath} alt={name} size={20} />
    ) : (
      <Bot className="h-4 w-4 text-purple-600" />
    )}
  </div>
);

// 実行行コンポーネント
type ExecutionRowProps = {
  execution: Execution;
  orgSlug: string;
};

const ExecutionRow = ({ execution, orgSlug }: ExecutionRowProps) => {
  const handleClick = () => {
    window.location.href = `/${orgSlug}/agents/${execution.agentSlug}`;
  };

  const badgeClass = execution.success
    ? STATUS_BADGE_CLASSES.success
    : STATUS_BADGE_CLASSES.failure;

  return (
    <TableRow
      className="group cursor-pointer transition-all duration-150 hover:bg-blue-50/50 hover:shadow-sm"
      onClick={handleClick}
    >
      <TableCell className="w-24">
        <Badge variant="outline" className={badgeClass}>
          {execution.success ? "成功" : "失敗"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <AgentIcon
            iconPath={execution.agentIconPath}
            name={execution.agentName}
          />
          <span className="truncate font-medium text-gray-900">
            {execution.agentName}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        <DurationDisplay durationMs={execution.durationMs} />
      </TableCell>
      <TableCell className="font-mono text-xs text-gray-700">
        {formatDistanceToNow(new Date(execution.createdAt), {
          addSuffix: true,
          locale: ja,
        })}
      </TableCell>
    </TableRow>
  );
};

// テーブルヘッダーの定義
const TABLE_HEADERS = [
  "ステータス",
  "エージェント",
  "実行時間",
  "時刻",
] as const;

export const RecentExecutions = ({
  executions,
  orgSlug,
}: RecentExecutionsProps) => {
  if (executions.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card className="border-0 shadow-md">
      <ExecutionCardHeader />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200">
                {TABLE_HEADERS.map((header) => (
                  <TableHead
                    key={header}
                    className="h-10 font-semibold text-gray-700"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <ExecutionRow
                  key={execution.id}
                  execution={execution}
                  orgSlug={orgSlug}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
