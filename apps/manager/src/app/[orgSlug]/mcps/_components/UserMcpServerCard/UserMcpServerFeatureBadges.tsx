"use client";

import type { ReactNode } from "react";
import { Badge } from "@tumiki/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import type { PiiMaskingMode } from "@tumiki/db/prisma";
import type { LucideIcon } from "lucide-react";
import { Search, ShieldCheck, Shrink } from "lucide-react";

type FeatureBadgesProps = {
  /** PIIマスキングモード */
  piiMaskingMode: PiiMaskingMode;
  /** Dynamic Search有効フラグ */
  dynamicSearch: boolean;
  /** TOON変換有効フラグ */
  toonConversionEnabled: boolean;
};

/** PIIマスキングモードの表示テキスト */
const PII_MASKING_LABELS: Record<PiiMaskingMode, string> = {
  DISABLED: "",
  REQUEST: "リクエストをマスキング",
  RESPONSE: "レスポンスをマスキング",
  BOTH: "双方向マスキング",
};

type FeatureBadgeProps = {
  icon: LucideIcon;
  label: string;
  tooltip: ReactNode;
  colorClass: string;
};

/** 個別の機能バッジ */
const FeatureBadge = ({
  icon: Icon,
  label,
  tooltip,
  colorClass,
}: FeatureBadgeProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={`flex cursor-default items-center gap-1 border-0 px-1.5 py-0.5 ${colorClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon className="size-3" />
          <span className="text-[10px] font-medium">{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/**
 * 機能バッジコンポーネント
 * PIIマスキング、Dynamic Search、TOON変換の有効状態を表示
 */
export const FeatureBadges = ({
  piiMaskingMode,
  dynamicSearch,
  toonConversionEnabled,
}: FeatureBadgesProps) => {
  const isPiiEnabled = piiMaskingMode !== "DISABLED";

  if (!isPiiEnabled && !dynamicSearch && !toonConversionEnabled) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {dynamicSearch && (
        <FeatureBadge
          icon={Search}
          label="動的取得"
          tooltip="全ツール定義の代わりにメタツールのみをAIに公開し、コンテキスト量を削減"
          colorClass="bg-indigo-100 text-indigo-700"
        />
      )}

      {toonConversionEnabled && (
        <FeatureBadge
          icon={Shrink}
          label="データ圧縮"
          tooltip="レスポンスをTOON形式に変換し、トークン量を30〜60%削減"
          colorClass="bg-amber-100 text-amber-700"
        />
      )}

      {isPiiEnabled && (
        <FeatureBadge
          icon={ShieldCheck}
          label="マスキング"
          tooltip={`個人情報を自動マスキング: ${PII_MASKING_LABELS[piiMaskingMode]}`}
          colorClass="bg-emerald-100 text-emerald-700"
        />
      )}
    </div>
  );
};
