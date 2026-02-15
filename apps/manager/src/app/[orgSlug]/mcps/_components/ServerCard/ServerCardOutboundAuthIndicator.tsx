"use client";

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
import {
  calculateExpirationStatus,
  getDetailedExpirationText,
  type ExpirationStatus,
} from "@/lib/shared/expirationHelpers";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  type LucideIcon,
} from "lucide-react";

/** 未認証のOAuthインスタンス情報 */
type UnauthenticatedOAuthInstance = {
  /** テンプレート名（例: "Linear MCP"） */
  templateName: string;
  /** テンプレートのアイコンパス */
  iconPath?: string | null;
};

type OutboundAuthIndicatorProps = {
  /** OAuth認証済みかどうか（全インスタンス） */
  isAuthenticated: boolean;
  /** 最も早いOAuthトークン有効期限 */
  earliestExpiration?: Date | null;
  /** 再認証コールバック */
  onReauthenticate?: () => void | Promise<void>;
  /** 再認証中フラグ */
  isReauthenticating?: boolean;
  /** 未認証のOAuthインスタンス一覧 */
  unauthenticatedInstances?: UnauthenticatedOAuthInstance[];
};

/** バッジの表示状態 */
type DisplayState = {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  label: string;
  showPopover: boolean;
};

/** 警告を表示する残り日数の閾値 */
const EXPIRATION_WARNING_DAYS = 4;

/** 期限切れまたは警告状態かを判定 */
const isExpirationWarning = (status: ExpirationStatus | null): boolean => {
  if (!status) return false;
  if (status.isExpired) return true;
  if (status.daysRemaining !== null) {
    return status.daysRemaining <= EXPIRATION_WARNING_DAYS;
  }
  return false;
};

/** 表示状態を決定 */
const resolveDisplayState = (
  isAuthenticated: boolean,
  isExpiredOrWarning: boolean,
): DisplayState => {
  if (!isAuthenticated) {
    return {
      icon: AlertCircle,
      bgColor: "bg-amber-100",
      textColor: "text-amber-700",
      label: "要認証",
      showPopover: true,
    };
  }
  if (isExpiredOrWarning) {
    return {
      icon: Shield,
      bgColor: "bg-amber-100",
      textColor: "text-amber-700",
      label: "外部",
      showPopover: false,
    };
  }
  return {
    icon: Shield,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    label: "外部",
    showPopover: false,
  };
};

/** ツールチップ用のテキストを生成 */
const buildTooltipContent = (
  isAuthenticated: boolean,
  expirationStatus: ExpirationStatus | null,
  expirationText: string | null,
): string => {
  if (!isAuthenticated) {
    return "外部サービス: 認証が必要です";
  }
  if (expirationStatus?.isExpired) {
    return "外部サービス: 期限切れ（再認証が必要）";
  }
  if (expirationText) {
    return `外部サービス: ${expirationText}`;
  }
  return "外部サービス: 認証済み";
};

/**
 * Outbound認証インジケーター
 * このMCPサーバーから外部サービス（Linear, GitHubなど）への接続状態を表示
 */
export const OutboundAuthIndicator = ({
  isAuthenticated,
  earliestExpiration,
  onReauthenticate,
  isReauthenticating = false,
  unauthenticatedInstances = [],
}: OutboundAuthIndicatorProps) => {
  // 有効期限の状態を計算
  const expirationStatus = earliestExpiration
    ? calculateExpirationStatus(earliestExpiration)
    : null;
  const expirationText = earliestExpiration
    ? getDetailedExpirationText(earliestExpiration)
    : null;

  const isExpiredOrWarning = isExpirationWarning(expirationStatus);
  const state = resolveDisplayState(isAuthenticated, isExpiredOrWarning);
  const Icon = state.icon;
  const tooltipContent = buildTooltipContent(
    isAuthenticated,
    expirationStatus,
    expirationText,
  );

  const BadgeComponent = (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 border-0 px-2 py-1",
        state.bgColor,
        state.textColor,
        state.showPopover && "cursor-pointer hover:opacity-80",
      )}
    >
      <span className="text-[10px] font-medium">{state.label}</span>
      <Icon className="size-3" />
    </Badge>
  );

  // 未認証時はPopoverを表示
  if (state.showPopover && onReauthenticate) {
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
                <p className="text-sm font-medium">外部サービスの認証が必要</p>
              </div>

              <UnauthenticatedInstancesList
                instances={unauthenticatedInstances}
              />

              <Button
                size="sm"
                className="w-full"
                onClick={() => void onReauthenticate()}
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

  // 認証済みの場合はTooltipのみ
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

/** 未認証インスタンス一覧コンポーネント */
const UnauthenticatedInstancesList = ({
  instances,
}: {
  instances: UnauthenticatedOAuthInstance[];
}) => {
  if (instances.length === 0) {
    return (
      <p className="text-xs text-gray-600">
        外部MCPサービスを利用するには、OAuthで認証する必要があります。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">以下のサービスで認証が必要です：</p>
      <ul className="space-y-1">
        {instances.map((instance, index) => (
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
  );
};
