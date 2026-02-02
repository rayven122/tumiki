import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AuthType } from "@tumiki/db/prisma";
import {
  AlertCircle,
  Key,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unlock,
} from "lucide-react";

/**
 * 未認証のOAuthインスタンス情報
 */
type UnauthenticatedOAuthInstance = {
  /** テンプレート名（例: "Linear MCP"） */
  templateName: string;
  /** テンプレートのアイコンパス */
  iconPath?: string | null;
};

type AuthTypeIndicatorProps = {
  authType: AuthType;
  apiKeyCount?: number;
  // OAuth認証状態（null: OAuthが不要、true: 認証済み、false: 未認証）
  isOAuthAuthenticated?: boolean | null;
  // 再認証コールバック（OAuth未認証時のみ使用）
  onReauthenticate?: () => void;
  // 再認証中フラグ
  isReauthenticating?: boolean;
  // 未認証のOAuthインスタンス一覧（カスタムMCPで表示用）
  unauthenticatedInstances?: UnauthenticatedOAuthInstance[];
};

const AUTH_TYPE_CONFIG = {
  OAUTH: {
    icon: ShieldCheck,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    label: "OAuth",
  },
  OAUTH_UNAUTHENTICATED: {
    icon: AlertCircle,
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    label: "要認証",
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
  isOAuthAuthenticated,
  onReauthenticate,
  isReauthenticating = false,
  unauthenticatedInstances = [],
}: AuthTypeIndicatorProps) => {
  // OAuth未認証の場合は未認証用の設定を使用
  const configKey =
    authType === "OAUTH" && isOAuthAuthenticated === false
      ? "OAUTH_UNAUTHENTICATED"
      : authType;
  const config = AUTH_TYPE_CONFIG[configKey];
  const Icon = config.icon;

  // OAuth未認証でポップオーバーを表示するかどうか
  const showPopover =
    authType === "OAUTH" &&
    isOAuthAuthenticated === false &&
    onReauthenticate !== undefined;

  // Tooltip内容を生成
  const getTooltipContent = () => {
    if (authType === "API_KEY" && apiKeyCount !== undefined) {
      return `接続方法: ${AUTH_TYPE_CONFIG.API_KEY.label}（${apiKeyCount}件発行済み）`;
    }
    if (authType === "OAUTH" && isOAuthAuthenticated === false) {
      return "OAuth認証が必要です";
    }
    if (authType === "OAUTH" && isOAuthAuthenticated === true) {
      return "接続方法: OAuth（認証済み）";
    }
    return `接続方法: ${config.label}`;
  };
  const tooltipContent = getTooltipContent();

  // バッジコンポーネント
  const BadgeComponent = (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 border-0 px-2 py-1",
        config.bgColor,
        config.textColor,
        showPopover && "cursor-pointer hover:opacity-80",
      )}
    >
      <Icon className="size-3" />
      {authType === "API_KEY" && apiKeyCount !== undefined && (
        <span className="text-xs font-semibold">{apiKeyCount}</span>
      )}
    </Badge>
  );

  // OAuth未認証時はTooltip + Popoverを表示
  if (showPopover) {
    return (
      <TooltipProvider>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                {BadgeComponent}
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipContent}（クリックで認証）</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-72 p-4"
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-600" />
                <p className="text-sm font-medium">OAuth認証が必要です</p>
              </div>

              {/* 未認証のMCP一覧を表示 */}
              {unauthenticatedInstances.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    以下のMCPで認証が必要です：
                  </p>
                  <ul className="space-y-1">
                    {unauthenticatedInstances.map((instance, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs"
                      >
                        <AlertCircle className="size-3 shrink-0 text-amber-600" />
                        <span className="font-medium text-amber-800">
                          {instance.templateName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  このMCPサーバーを利用するには、OAuthで認証する必要があります。
                </p>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={onReauthenticate}
                disabled={isReauthenticating}
              >
                {isReauthenticating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    認証中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    認証する
                  </>
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }

  // それ以外はTooltipを表示
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{BadgeComponent}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
