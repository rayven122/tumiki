"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, User } from "lucide-react";

type ServerMetaInfoProps = {
  /** 最終使用日時（APIキーの中で最も新しいもの） */
  lastUsedAt: Date | null;
  /** 作成者名 */
  creatorName: string | null;
  /** 自分が作成したかどうか */
  isOwnServer: boolean;
  /** 作成者情報が存在するかどうか */
  hasCreator: boolean;
};

const formatRelativeTime = (date: Date): string =>
  formatDistanceToNow(date, { addSuffix: true, locale: ja });

const formatAbsoluteDate = (date: Date): string =>
  format(date, "yyyy/MM/dd HH:mm", { locale: ja });

/** 作成者の表示名を取得 */
const getCreatorDisplayName = (
  creatorName: string | null,
  isOwnServer: boolean,
  hasCreator: boolean,
): string | null => {
  if (isOwnServer) return "自分が作成";
  if (creatorName) return creatorName;
  if (hasCreator) return "作成者不明";
  return null;
};

/**
 * サーバーメタ情報コンポーネント
 * 最終使用日時と作成者情報を表示
 */
export const ServerMetaInfo = ({
  lastUsedAt,
  creatorName,
  isOwnServer,
  hasCreator,
}: ServerMetaInfoProps) => {
  const creatorDisplayName = getCreatorDisplayName(
    creatorName,
    isOwnServer,
    hasCreator,
  );

  if (!lastUsedAt && !creatorDisplayName) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      {lastUsedAt && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="flex cursor-default items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="size-3" />
                <span>{formatRelativeTime(lastUsedAt)}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>最終使用: {formatAbsoluteDate(lastUsedAt)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {creatorDisplayName && (
        <span className="flex items-center gap-1">
          <User className="size-3" />
          <span>{creatorDisplayName}</span>
        </span>
      )}
    </div>
  );
};
