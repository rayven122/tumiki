import { AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type OAuthTokenStatus = {
  hasToken: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
};

type OAuthTokenStatusBadgeProps = {
  oauthTokenStatus: OAuthTokenStatus | null;
};

export const OAuthTokenStatusBadge = ({
  oauthTokenStatus,
}: OAuthTokenStatusBadgeProps) => {
  if (!oauthTokenStatus) {
    return null;
  }

  // トークンが期限切れまたは存在しない場合
  if (!oauthTokenStatus.hasToken || oauthTokenStatus.isExpired) {
    return (
      <Badge
        variant="destructive"
        className="flex items-center gap-1 text-xs font-medium"
      >
        <AlertCircle className="h-3 w-3" />
        認証が必要
      </Badge>
    );
  }

  // トークンの期限が迫っている場合（1日以内）
  if (oauthTokenStatus.isExpiringSoon) {
    const displayText =
      oauthTokenStatus.daysRemaining === 0
        ? "期限間近（1日未満）"
        : `残り${oauthTokenStatus.daysRemaining}日`;

    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-amber-500 bg-amber-50 text-xs font-medium text-amber-700"
      >
        <AlertTriangle className="h-3 w-3" />
        {displayText}
      </Badge>
    );
  }

  // 正常（期限まで余裕がある場合）
  if (oauthTokenStatus.daysRemaining !== null) {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-green-500 bg-green-50 text-xs font-medium text-green-700"
      >
        <Clock className="h-3 w-3" />
        残り{oauthTokenStatus.daysRemaining}日
      </Badge>
    );
  }

  return null;
};
