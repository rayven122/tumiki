"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { Button } from "@tumiki/ui/button";
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
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { formatDuration, getPaginationPages } from "@/features/dashboard/utils";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import { ExecutionHistoryModal } from "../../agents/[agentSlug]/_components/ExecutionHistoryModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";

type RecentExecutionsProps = {
  orgSlug: string;
};

const PAGE_SIZE = 5;

const StatusBadge = ({ success }: { success: boolean | null }) => {
  if (success === null) {
    return (
      <Badge variant="outline" className="text-gray-500">
        <Clock className="mr-1 h-3 w-3" />
        実行中
      </Badge>
    );
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

const MAX_VISIBLE_ICONS = 5;

type McpServerIcon = {
  id: string;
  iconPath: string | null;
};

const McpServerIcons = ({ icons }: { icons: McpServerIcon[] }) => {
  if (icons.length === 0) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const visibleIcons = icons.slice(0, MAX_VISIBLE_ICONS);
  const remainingCount = icons.length - MAX_VISIBLE_ICONS;

  return (
    <div className="flex items-center">
      {visibleIcons.map((icon, index) => (
        <div
          key={icon.id}
          className="relative"
          style={{ marginLeft: index === 0 ? 0 : -6 }}
        >
          <div className="ring-background bg-muted flex h-7 w-7 items-center justify-center rounded-lg ring-2">
            <EntityIcon
              iconPath={icon.iconPath}
              type="mcp"
              size="sm"
              className="h-7 w-7 rounded-lg"
            />
          </div>
        </div>
      ))}
      {remainingCount > 0 && (
        <span className="text-muted-foreground ml-1 text-xs">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

type SortKey = "createdAt" | "success" | "durationMs";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
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

// 性格アイコンの表示（画像パスまたは絵文字）
const PersonaIcon = ({ icon }: { icon: string }) => {
  if (icon.startsWith("/")) {
    return (
      <img
        src={icon}
        alt=""
        className="h-4 w-4 shrink-0 rounded-full object-cover"
      />
    );
  }
  return <span className="text-sm leading-none">{icon}</span>;
};

// 性格セルの表示
type PersonaCellContentProps = {
  personaId: string | null;
  personaMap: Map<string, { name: string; icon?: string }>;
};

const PersonaCellContent = ({
  personaId,
  personaMap,
}: PersonaCellContentProps) => {
  if (!personaId) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const persona = personaMap.get(personaId);
  if (!persona) {
    return <span className="text-muted-foreground text-xs">{personaId}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            {persona.icon && <PersonaIcon icon={persona.icon} />}
            {persona.name}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">性格: {persona.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

type ExecutionResultForModal = {
  success: boolean;
  executionId: string;
  output: string;
  durationMs: number;
  chatId?: string;
  error?: string;
};

type Execution =
  RouterOutputs["dashboard"]["getRecentExecutions"]["items"][number];

export const RecentExecutions = ({ orgSlug }: RecentExecutionsProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<SortState>({
    key: "createdAt",
    direction: "desc",
  });
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionResultForModal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
    setCurrentPage(1);
  };

  const { data } = api.dashboard.getRecentExecutions.useQuery(
    {
      page: currentPage,
      pageSize: PAGE_SIZE,
      sortKey: sort.key,
      sortDirection: sort.direction,
    },
    { placeholderData: keepPreviousData },
  );

  const { data: personas } = api.chat.listPersonas.useQuery();
  const personaMap = useMemo(() => {
    if (!personas) return new Map<string, { name: string; icon?: string }>();
    return new Map(personas.map((p) => [p.id, { name: p.name, icon: p.icon }]));
  }, [personas]);

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

  if (!data || data.totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            最近の実行履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-col items-center justify-center py-4 text-center">
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

  const { items, totalCount, totalPages } = data;
  const startIndex = (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <>
      <Card>
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
                  <SortableHeader
                    label="実行日時"
                    sortKey="createdAt"
                    currentSort={sort}
                    onSort={handleSort}
                  />
                  <TableHead className="min-w-[180px]">エージェント</TableHead>
                  <TableHead className="whitespace-nowrap">性格</TableHead>
                  <TableHead className="whitespace-nowrap">MCP</TableHead>
                  <TableHead className="whitespace-nowrap">トリガー</TableHead>
                  <TableHead className="whitespace-nowrap">モデル</TableHead>
                  <SortableHeader
                    label="ステータス"
                    sortKey="success"
                    currentSort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="実行時間"
                    sortKey="durationMs"
                    currentSort={sort}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <TableHead className="w-[60px] text-center">詳細</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((execution) => (
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
                      <PersonaCellContent
                        personaId={execution.personaId}
                        personaMap={personaMap}
                      />
                    </TableCell>
                    <TableCell>
                      <McpServerIcons icons={execution.mcpServerIcons} />
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
                {/* 行数が PAGE_SIZE 未満の場合、空行で埋めてカードの高さを固定 */}
                {Array.from({ length: PAGE_SIZE - items.length }).map(
                  (_, i) => (
                    <TableRow
                      key={`empty-${String(i)}`}
                      className="hover:bg-transparent"
                    >
                      <TableCell colSpan={9}>
                        <div className="h-8" />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                {totalCount}件中 {startIndex}-{endIndex}件を表示
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="ml-1">前へ</span>
                </Button>
                <div className="flex items-center gap-1">
                  {getPaginationPages(currentPage, totalPages).map(
                    (page, index, array) => {
                      const prevPage = array[index - 1];
                      const showEllipsis =
                        prevPage !== undefined && page - prevPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-10"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    },
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <span className="mr-1">次へ</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
