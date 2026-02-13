import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExpirationText } from "@/utils/shared/expirationHelpers";

type ApiKeyStatus = {
  isExpired: boolean;
  daysRemaining: number | null;
};

type ApiKeyExpirationDisplayProps = {
  apiKeyStatus?: ApiKeyStatus | null;
};

export const ApiKeyExpirationDisplay = ({
  apiKeyStatus,
}: ApiKeyExpirationDisplayProps) => {
  // 表示するものがない場合は何も表示しない
  if (!apiKeyStatus) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {/* API キーの有効期限 */}
      {apiKeyStatus && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          <span className="font-medium text-gray-700">Tumiki API Key</span>
          <span className="text-gray-400">|</span>
          <span
            className={cn(
              "font-semibold",
              apiKeyStatus.isExpired ||
                (apiKeyStatus.daysRemaining !== null &&
                  apiKeyStatus.daysRemaining <= 1)
                ? "text-red-600"
                : "text-gray-700",
            )}
          >
            {getExpirationText(
              apiKeyStatus.isExpired,
              apiKeyStatus.daysRemaining,
            )}
          </span>
        </div>
      )}
    </div>
  );
};
