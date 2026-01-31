import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AuthType } from "@tumiki/db/prisma";
import { Key, ShieldCheck, Unlock } from "lucide-react";

type AuthTypeIndicatorProps = {
  authType: AuthType;
  apiKeyCount?: number;
};

const AUTH_TYPE_CONFIG = {
  OAUTH: {
    icon: ShieldCheck,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    label: "OAuth",
  },
  API_KEY: {
    icon: Key,
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    label: "API Key",
  },
  NONE: {
    icon: Unlock,
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    label: "設定不要",
  },
} as const;

export const AuthTypeIndicator = ({
  authType,
  apiKeyCount,
}: AuthTypeIndicatorProps) => {
  const config = AUTH_TYPE_CONFIG[authType];
  const Icon = config.icon;

  // Tooltip内容を生成
  const tooltipContent =
    authType === "API_KEY" && apiKeyCount !== undefined
      ? `接続方法: ${config.label}（${apiKeyCount}件発行済み）`
      : `接続方法: ${config.label}`;

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
            )}
          >
            <Icon className="size-3" />
            {authType === "API_KEY" && apiKeyCount !== undefined && (
              <span className="text-xs font-semibold">{apiKeyCount}</span>
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
