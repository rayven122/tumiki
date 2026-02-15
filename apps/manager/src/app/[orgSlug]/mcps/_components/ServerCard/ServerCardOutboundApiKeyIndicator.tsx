import { Badge } from "@tumiki/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { cn } from "@/lib/utils";
import { Key } from "lucide-react";

type OutboundApiKeyIndicatorProps = {
  /** API_KEYテンプレートの数 */
  templateCount: number;
  /** クリック時のハンドラー（設定画面へ遷移など） */
  onClick?: () => void;
};

/**
 * Outbound API Key認証インジケーター
 * 外部サービスへのAPI Key認証が必要なテンプレートがあることを表示
 */
export const OutboundApiKeyIndicator = ({
  templateCount,
  onClick,
}: OutboundApiKeyIndicatorProps) => {
  const isClickable = onClick !== undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (isClickable) {
      e.stopPropagation();
      onClick();
    }
  };

  const tooltipContent = isClickable
    ? `外部: API Key認証（${templateCount}件）（クリックで設定）`
    : `外部: API Key認証（${templateCount}件）`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              "flex items-center gap-1 border-0 px-2 py-1",
              "bg-purple-100 text-purple-700",
              isClickable && "cursor-pointer hover:opacity-80",
            )}
            onClick={handleClick}
          >
            <span className="text-[10px] font-medium">外部</span>
            <Key className="size-3" />
            {templateCount > 1 && (
              <span className="text-xs font-semibold">{templateCount}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
