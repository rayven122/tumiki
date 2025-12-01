"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Eye, EyeOff, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ApiKeyItemProps = {
  apiKey: {
    id: string;
    name: string;
    apiKey: string | null;
    isActive: boolean;
    createdAt: Date;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
  };
  isVisible: boolean;
  onToggleVisibility: () => void;
  onCopy: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
};

export const ApiKeyItem = ({
  apiKey,
  isVisible,
  onToggleVisibility,
  onCopy,
  onDeactivate,
  onDelete,
}: ApiKeyItemProps) => {
  // 有効期限のチェック
  const isExpired = apiKey.expiresAt
    ? new Date(apiKey.expiresAt) < new Date()
    : false;

  // 残り日数の計算
  const getRemainingDays = () => {
    if (!apiKey.expiresAt) return null;
    const now = new Date();
    const expiresAt = new Date(apiKey.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();

  return (
    <div className="border-b py-4 transition-colors hover:bg-gray-50">
      <div className="flex items-start justify-between space-x-4">
        <div
          className={cn(
            "min-w-0 flex-1",
            (!apiKey.isActive || isExpired) && "opacity-60",
          )}
        >
          <div className="mb-2 flex items-center space-x-2">
            <Key className="h-4 w-4 flex-shrink-0 text-gray-500" />
            <span className="truncate text-sm font-medium">{apiKey.name}</span>
            <Badge
              variant={
                isExpired
                  ? "destructive"
                  : apiKey.isActive
                    ? "default"
                    : "secondary"
              }
              className="text-xs"
            >
              {isExpired ? "期限切れ" : apiKey.isActive ? "有効" : "無効"}
            </Badge>
            {remainingDays !== null && !isExpired && (
              <Badge
                variant={
                  remainingDays <= 3
                    ? "destructive"
                    : remainingDays <= 7
                      ? "outline"
                      : "secondary"
                }
                className="text-xs"
              >
                <Clock className="mr-1 h-3 w-3" />
                残り{remainingDays}日
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <code className="flex-1 truncate rounded bg-gray-100 px-2 py-1 font-mono text-xs">
              {isVisible ? apiKey.apiKey : "••••••••••••••••"}
            </code>
            {apiKey.isActive && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={onToggleVisibility}
                >
                  {isVisible ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={onCopy}
                  disabled={!apiKey.apiKey}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              作成日: {new Date(apiKey.createdAt).toLocaleDateString("ja-JP")}
            </span>
            {apiKey.lastUsedAt && (
              <span>
                最終使用:{" "}
                {new Date(apiKey.lastUsedAt).toLocaleDateString("ja-JP")}
              </span>
            )}
            {apiKey.expiresAt && (
              <span className={cn(isExpired && "font-medium text-red-600")}>
                有効期限:{" "}
                {new Date(apiKey.expiresAt).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          {apiKey.isActive && (
            <Button variant="outline" size="sm" onClick={onDeactivate}>
              無効化
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            削除
          </Button>
        </div>
      </div>
    </div>
  );
};
