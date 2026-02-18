import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Shrink,
  ShieldCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDataSize } from "@tumiki/shared";
import { getPaginationPages } from "./utils";
import { MaskingInfoCell } from "./MaskingInfoCell";
import { TokenInfoCell } from "./TokenInfoCell";
import type { RequestLog } from "../types";

type RequestLogsTableProps = {
  logs: RequestLog[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
};

export const RequestLogsTable = ({
  logs,
  isLoading,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}: RequestLogsTableProps) => {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <p className="text-sm text-gray-500">読み込み中...</p>
            </div>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200">
                    <TableHead className="h-12 w-40 font-semibold text-gray-700">
                      時刻
                    </TableHead>
                    <TableHead className="h-12 w-28 font-semibold text-gray-700">
                      メソッド
                    </TableHead>
                    <TableHead className="h-12 min-w-40 font-semibold text-gray-700">
                      ツール名
                    </TableHead>
                    <TableHead className="h-12 w-24 font-semibold text-gray-700">
                      実行時間
                    </TableHead>
                    <TableHead className="h-12 w-28 font-semibold text-gray-700">
                      データサイズ
                    </TableHead>
                    <TableHead className="h-12 w-32 font-semibold text-gray-700">
                      <div className="flex items-center gap-1">
                        トークン
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2 text-xs">
                              <p>
                                GPT-4モデル（cl100k_base）での推定値です。
                                実際のトークン数はモデルによって異なります。
                              </p>
                              <div className="flex items-center gap-2 border-t border-gray-600 pt-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded border border-green-200 bg-green-50">
                                  <Shrink className="h-3 w-3 text-green-600" />
                                </div>
                                <span>データ圧縮が有効</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="h-12 w-36 font-semibold text-gray-700">
                      <div className="flex items-center gap-1">
                        マスキング
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2 text-xs">
                              <p>
                                機密情報（メール、電話番号、氏名など）を
                                自動検出しマスキングします。
                              </p>
                              <div className="flex items-center gap-2 border-t border-gray-600 pt-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded border border-orange-200 bg-orange-50">
                                  <ShieldCheck className="h-3 w-3 text-orange-600" />
                                </div>
                                <span>マスキング有効</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="group transition-all duration-150 hover:bg-blue-50/50 hover:shadow-sm"
                    >
                      <TableCell className="font-mono text-xs text-gray-700">
                        {new Date(log.createdAt).toLocaleString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <Badge
                          variant="outline"
                          className={
                            log.method === "tools/call"
                              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                              : "border-gray-200 bg-gray-50 text-gray-600 shadow-sm"
                          }
                        >
                          {log.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {log.method === "tools/list" ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <div className="truncate font-mono text-sm font-medium text-gray-900">
                            {log.toolName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-700">
                            {log.durationMs}
                          </span>
                          <span className="text-gray-500">ms</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-600">↑</span>
                            <span className="font-medium text-gray-700">
                              {formatDataSize(log.inputBytes)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-blue-600">↓</span>
                            <span className="font-medium text-gray-700">
                              {formatDataSize(log.outputBytes)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TokenInfoCell
                          inputTokens={log.inputTokens}
                          outputTokens={log.outputTokens}
                          toonConversionEnabled={log.toonConversionEnabled}
                        />
                      </TableCell>
                      <TableCell>
                        <MaskingInfoCell
                          piiMaskingMode={log.piiMaskingMode}
                          piiDetectedRequestCount={log.piiDetectedRequestCount}
                          piiDetectedResponseCount={
                            log.piiDetectedResponseCount
                          }
                          piiDetectedInfoTypes={log.piiDetectedInfoTypes}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <div className="text-sm text-gray-500">
                  {totalItems}件中 {startIndex}-{endIndex}件を表示
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                              onClick={() => onPageChange(page)}
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
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <span className="mr-1">次へ</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            リクエストログがありません
          </div>
        )}
      </CardContent>
    </Card>
  );
};
