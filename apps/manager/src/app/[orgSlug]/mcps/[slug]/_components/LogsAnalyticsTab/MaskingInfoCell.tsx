import { Tooltip, TooltipContent, TooltipTrigger } from "@tumiki/ui/tooltip";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { getPiiTypeLabel } from "@/features/dashboard/utils/piiTypeLabels";
import type { PiiMaskingMode } from "./constants";

type MaskingInfoCellProps = {
  piiMaskingMode: PiiMaskingMode;
  piiDetectedRequestCount: number | null;
  piiDetectedResponseCount: number | null;
  piiDetectedInfoTypes: string[];
};

/**
 * 機密情報マスキングの詳細を表示するセルコンポーネント
 * マスキングが有効な場合は検出された項目と件数を表示
 */
export const MaskingInfoCell = ({
  piiMaskingMode,
  piiDetectedRequestCount,
  piiDetectedResponseCount,
  piiDetectedInfoTypes,
}: MaskingInfoCellProps) => {
  const isEnabled = piiMaskingMode !== "DISABLED";
  const requestCount = piiDetectedRequestCount ?? 0;
  const responseCount = piiDetectedResponseCount ?? 0;
  const totalCount = requestCount + responseCount;
  const hasDetections = totalCount > 0;

  // マスキング無効の場合
  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center">
        <ShieldOff className="h-4 w-4 text-gray-300" />
      </div>
    );
  }

  // マスキング有効だが検出なしの場合
  if (!hasDetections) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-50">
              <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">マスキング有効（検出なし）</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // マスキング有効で検出ありの場合
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <div className="relative flex h-6 w-6 items-center justify-center rounded border border-orange-200 bg-orange-50">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-orange-600">
              {totalCount}件
            </span>
            {piiDetectedInfoTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {piiDetectedInfoTypes.slice(0, 2).map((type) => (
                  <span
                    key={type}
                    className="rounded bg-orange-100 px-1 text-[10px] text-orange-700"
                  >
                    {getPiiTypeLabel(type)}
                  </span>
                ))}
                {piiDetectedInfoTypes.length > 2 && (
                  <span className="text-[10px] text-orange-500">
                    +{piiDetectedInfoTypes.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2 text-xs">
          <p className="font-medium">機密情報マスキング</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">リクエスト:</span>
              <span className="font-medium">{requestCount}件</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">レスポンス:</span>
              <span className="font-medium">{responseCount}件</span>
            </div>
          </div>
          {piiDetectedInfoTypes.length > 0 && (
            <div className="border-t border-gray-600 pt-2">
              <p className="mb-1 text-gray-400">検出された種類:</p>
              <div className="flex flex-wrap gap-1">
                {piiDetectedInfoTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded bg-gray-700 px-1.5 py-0.5 text-gray-200"
                  >
                    {getPiiTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
