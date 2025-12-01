import { AlertCircle, AlertTriangle } from "lucide-react";
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
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-amber-500 bg-amber-50 text-xs font-medium text-amber-700"
      >
        <AlertTriangle className="h-3 w-3" />
        期限間近
      </Badge>
    );
  }

  // 正常（期限まで余裕がある場合）は何も表示しない
  return null;
};
