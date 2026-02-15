import { Badge } from "@tumiki/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { Unlock } from "lucide-react";

/**
 * Outbound認証不要インジケーター
 * 外部サービスへの認証が不要なテンプレートがあることを表示
 */
export const OutboundNoneIndicator = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 border-0 bg-gray-100 px-2 py-1 text-gray-600"
          >
            <span className="text-[10px] font-medium">外部</span>
            <Unlock className="size-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>外部: 認証不要のサービスを含む</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
