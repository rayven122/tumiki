import React from "react";
import { Shrink } from "lucide-react";
import { formatTokenCount, calculateTokenReductionRate } from "@tumiki/shared";

type TokenInfoCellProps = {
  inputTokens: number | null;
  outputTokens: number | null;
  toonConversionEnabled: boolean | null;
};

/**
 * トークン数を表示するセルコンポーネント
 * TOON変換が有効な場合は圧縮アイコンと削減率も表示
 */
export const TokenInfoCell = ({
  inputTokens,
  outputTokens,
  toonConversionEnabled,
}: TokenInfoCellProps) => {
  // トークンデータがない場合
  if (outputTokens === null && inputTokens === null) {
    return <span className="text-gray-400">-</span>;
  }

  const reductionRate = calculateTokenReductionRate(inputTokens, outputTokens);
  const showReduction =
    toonConversionEnabled === true && reductionRate !== null;

  return (
    <div className="flex items-center gap-1.5">
      {toonConversionEnabled === true && (
        <div className="flex h-5 w-5 items-center justify-center rounded border border-green-200 bg-green-50">
          <Shrink className="h-3 w-3 text-green-600" />
        </div>
      )}
      <span className="font-mono text-xs font-medium text-gray-700">
        {formatTokenCount(outputTokens)}
      </span>
      {showReduction && reductionRate > 0 && (
        <span className="text-xs text-green-600">(-{reductionRate}%)</span>
      )}
      {showReduction && reductionRate <= 0 && (
        <span className="text-xs text-gray-500">(0%)</span>
      )}
    </div>
  );
};
