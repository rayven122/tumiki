"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@tumiki/ui/card";
import { Badge } from "@tumiki/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@tumiki/ui/table";
import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { api } from "@/trpc/react";
import { formatDuration, type TimeRange } from "@/features/dashboard/utils";
import type { AgentPerformance as AgentPerformanceData } from "@/features/dashboard/api/schemas";
import { EntityIcon } from "@/features/shared/components/EntityIcon";

type SortKey =
  | "totalExecutions"
  | "successRate"
  | "avgDurationMs"
  | "lastExecutionAt";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

// 成功率の閾値に基づくスタイルを返す
const getSuccessRateStyles = (
  rate: number,
): { barColor: string; textColor: string } => {
  if (rate < 50)
    return { barColor: "bg-destructive", textColor: "text-destructive" };
  if (rate < 80)
    return { barColor: "bg-amber-500", textColor: "text-amber-600" };
  return { barColor: "bg-dashboard-success", textColor: "" };
};

const SuccessRateBar = ({ rate }: { rate: number }) => {
  const { barColor, textColor } = getSuccessRateStyles(rate);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-sm ${textColor}`}>{rate}%</span>
    </div>
  );
};

const LastExecutionStatusBadge = ({ success }: { success: boolean | null }) => {
  if (success === null) {
    return <span className="text-muted-foreground">-</span>;
  }
  if (success) {
    return (
      <Badge
        variant="default"
        className="bg-dashboard-success-muted hover:bg-dashboard-success-muted text-emerald-700"
      >
        <CheckCircle className="mr-1 h-3 w-3" />
        成功
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      失敗
    </Badge>
  );
};

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
};

const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = "",
}: SortableHeaderProps) => {
  const isActive = currentSort.key === sortKey;

  return (
    <TableHead
      className={`cursor-pointer whitespace-nowrap select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive &&
          (currentSort.direction === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </div>
    </TableHead>
  );
};

type AgentItem = AgentPerformanceData["agents"][number];

const sortAgents = (agents: AgentItem[], sort: SortState): AgentItem[] => {
  return [...agents].sort((a, b) => {
    const dir = sort.direction === "asc" ? 1 : -1;

    switch (sort.key) {
      case "totalExecutions":
        return (a.totalExecutions - b.totalExecutions) * dir;
      case "successRate":
        return ((a.successRate ?? -1) - (b.successRate ?? -1)) * dir;
      case "avgDurationMs":
        return ((a.avgDurationMs ?? 0) - (b.avgDurationMs ?? 0)) * dir;
      case "lastExecutionAt": {
        const aTime = a.lastExecutionAt
          ? new Date(a.lastExecutionAt).getTime()
          : 0;
        const bTime = b.lastExecutionAt
          ? new Date(b.lastExecutionAt).getTime()
          : 0;
        return (aTime - bTime) * dir;
      }
    }
  });
};

const PerformanceCardContent = ({
  data,
  isLoading,
  orgSlug,
}: {
  data: AgentPerformanceData | undefined;
  isLoading: boolean;
  orgSlug: string;
}) => {
  // デフォルト: 成功率昇順（問題のあるエージェントが上）
  const [sort, setSort] = useState<SortState>({
    key: "successRate",
    direction: "asc",
  });

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  const sortedAgents = useMemo(
    () => (data ? sortAgents(data.agents, sort) : []),
    [data, sort],
  );

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data || data.agents.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-6 text-center">
        <BarChart3 className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">エージェントがありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">エージェント</TableHead>
            <SortableHeader
              label="実行数"
              sortKey="totalExecutions"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="成功率"
              sortKey="successRate"
              currentSort={sort}
              onSort={handleSort}
              className="min-w-[140px]"
            />
            <SortableHeader
              label="平均実行時間"
              sortKey="avgDurationMs"
              currentSort={sort}
              onSort={handleSort}
            />
            <SortableHeader
              label="最終実行"
              sortKey="lastExecutionAt"
              currentSort={sort}
              onSort={handleSort}
            />
            <TableHead className="whitespace-nowrap">ステータス</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAgents.map((agent) => {
            const isLowSuccessRate =
              agent.successRate !== null && agent.successRate < 50;

            return (
              <TableRow
                key={agent.agentId}
                className={isLowSuccessRate ? "bg-destructive/5" : ""}
              >
                <TableCell>
                  <Link
                    href={`/${orgSlug}/agents/${agent.agentSlug}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <EntityIcon
                      iconPath={agent.agentIconPath}
                      type="agent"
                      size="sm"
                      alt={agent.agentName}
                    />
                    <span className="font-medium">{agent.agentName}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  {agent.totalExecutions > 0 ? (
                    <div>
                      <span className="font-medium">
                        {agent.totalExecutions}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({agent.successCount}/{agent.errorCount})
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {agent.successRate !== null ? (
                    <SuccessRateBar rate={agent.successRate} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDuration(agent.avgDurationMs)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {agent.lastExecutionAt
                    ? formatDistanceToNow(new Date(agent.lastExecutionAt), {
                        addSuffix: true,
                        locale: ja,
                      })
                    : "-"}
                </TableCell>
                <TableCell>
                  <LastExecutionStatusBadge
                    success={agent.lastExecutionSuccess}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

type AgentPerformanceProps = {
  timeRange: TimeRange;
};

export const AgentPerformance = ({ timeRange }: AgentPerformanceProps) => {
  const params = useParams<{ orgSlug: string }>();

  const { data, isLoading } = api.dashboard.getAgentPerformance.useQuery({
    timeRange,
  });

  return (
    <Card>
      <CardContent className="p-0">
        <PerformanceCardContent
          data={data}
          isLoading={isLoading}
          orgSlug={params.orgSlug}
        />
      </CardContent>
    </Card>
  );
};
