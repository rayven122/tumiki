import { Badge } from "@tumiki/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AuthType } from "@tumiki/db/prisma";
import { Key, Shield, Unlock } from "lucide-react";

type InboundAuthIndicatorProps = {
  /** 接続方法（外部クライアント→このサーバー） */
  authType: AuthType;
  /** API_KEYの場合の発行済みキー数 */
  apiKeyCount?: number;
  /** API_KEYの場合のクリックハンドラー（APIキー管理画面へ遷移など） */
  onApiKeyClick?: () => void;
};

/** 各認証タイプの表示設定 */
const INBOUND_AUTH_CONFIG = {
  API_KEY: {
    icon: Key,
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    label: "API Key",
    badgeLabel: "接続",
    description: "APIキー認証で接続",
  },
  OAUTH: {
    icon: Shield,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    label: "OAuth",
    badgeLabel: "接続",
    description: "OAuth認証で接続",
  },
  NONE: {
    icon: Unlock,
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
    label: "認証不要",
    badgeLabel: "認証不要",
    description: "認証なしで接続可能",
  },
} as const;

/** ツールチップ用のテキストを生成 */
const buildTooltipContent = (
  authType: AuthType,
  config: (typeof INBOUND_AUTH_CONFIG)[AuthType],
  apiKeyCount?: number,
  isClickable?: boolean,
): string => {
  if (authType === "API_KEY" && apiKeyCount !== undefined) {
    const base = `接続: ${config.label}（${apiKeyCount}件発行済み）`;
    return isClickable ? `${base}（クリックで管理）` : base;
  }
  return `接続: ${config.description}`;
};

/**
 * Inbound認証インジケーター
 * 外部クライアントがこのMCPサーバーに接続する方法を表示
 */
export const InboundAuthIndicator = ({
  authType,
  apiKeyCount,
  onApiKeyClick,
}: InboundAuthIndicatorProps) => {
  const config = INBOUND_AUTH_CONFIG[authType];
  const Icon = config.icon;
  const showApiKeyCount = authType === "API_KEY" && apiKeyCount !== undefined;
  const isClickable = authType === "API_KEY" && onApiKeyClick !== undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (isClickable) {
      e.stopPropagation();
      onApiKeyClick();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              "flex items-center gap-1 border-0 px-2 py-1",
              config.bgColor,
              config.textColor,
              isClickable && "cursor-pointer hover:opacity-80",
            )}
            onClick={handleClick}
          >
            <span className="text-[10px] font-medium">{config.badgeLabel}</span>
            <Icon className="size-3" />
            {showApiKeyCount && (
              <span className="text-xs font-semibold">{apiKeyCount}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {buildTooltipContent(authType, config, apiKeyCount, isClickable)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
