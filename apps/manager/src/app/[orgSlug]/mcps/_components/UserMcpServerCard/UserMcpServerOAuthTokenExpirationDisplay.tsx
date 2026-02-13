import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateExpirationStatus,
  getOAuthExpirationBadgeClass,
  getDetailedExpirationText,
} from "@/utils/shared/expirationHelpers";

type OAuthTokenExpirationDisplayProps = {
  /** OAuthトークンの有効期限 */
  expiresAt: Date | null;
};

/**
 * OAuthトークンの有効期限表示コンポーネント
 *
 * OAuthトークンの有効期限は通常7日間なので、それを基準に色分け:
 * - 赤: 2日以下または期限切れ（緊急）
 * - オレンジ: 3-4日（警告）
 * - 緑: 5日以上（安全）
 */
export const OAuthTokenExpirationDisplay = ({
  expiresAt,
}: OAuthTokenExpirationDisplayProps) => {
  // 有効期限がない場合は何も表示しない
  if (!expiresAt) {
    return null;
  }

  const status = calculateExpirationStatus(expiresAt);
  const badgeClass = getOAuthExpirationBadgeClass(
    status.isExpired,
    status.daysRemaining,
  );
  const expirationText = getDetailedExpirationText(expiresAt);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <ShieldCheck className="h-3.5 w-3.5 text-gray-500" />
      <span className="font-medium text-gray-700">OAuth</span>
      <span className="text-gray-400">|</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          badgeClass,
        )}
      >
        {expirationText}
      </span>
    </div>
  );
};
