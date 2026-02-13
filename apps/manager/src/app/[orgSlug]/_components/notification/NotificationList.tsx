"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { NotificationItem } from "./NotificationItem";
import { Loader2 } from "lucide-react";

type FilterType = "all" | "unread";

const POLLING_INTERVAL = 60000; // 60秒
const PAGE_SIZE = 20;

/**
 * 通知リストコンポーネント
 * - 通知一覧を60秒ごとにポーリング
 * - フィルター: 未読/すべて
 * - ページネーション（無限スクロール）
 * - 「すべて既読にする」ボタン
 */
export const NotificationList = ({ onClose }: { onClose?: () => void }) => {
  const [filter, setFilter] = useState<FilterType>("unread");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  // 通知一覧を取得（ポーリング）
  const { data, isLoading, isFetchingNextPage, fetchNextPage } =
    api.notification.getNotifications.useInfiniteQuery(
      {
        limit: PAGE_SIZE,
        isRead: filter === "unread" ? false : undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        refetchInterval: POLLING_INTERVAL,
        refetchOnWindowFocus: true,
      },
    );

  // すべて既読にする
  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: async () => {
      await utils.notification.getNotifications.invalidate();
      await utils.notification.getUnreadCount.invalidate();
    },
  });

  // 無限スクロールのハンドラー
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const scrollPercentage =
        (target.scrollTop + target.clientHeight) / target.scrollHeight;

      // スクロール位置が80%を超えたら次のページを取得
      if (scrollPercentage > 0.8 && !isFetchingNextPage && data?.pages) {
        const lastPage = data.pages[data.pages.length - 1];
        if (lastPage?.nextCursor) {
          void fetchNextPage();
        }
      }
    },
    [isFetchingNextPage, data, fetchNextPage],
  );

  // すべての通知を平坦化
  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];

  return (
    <div className="flex max-h-[500px] w-full flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">通知</h2>
          {notifications.some((n) => !n.isRead) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              すべて既読にする
            </Button>
          )}
        </div>

        {/* フィルタータブ */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterType)}
          className="mt-3"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unread">未読</TabsTrigger>
            <TabsTrigger value="all">すべて</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 通知リスト */}
      <div
        ref={scrollAreaRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              {filter === "unread"
                ? "未読の通知はありません"
                : "通知はありません"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                id={notification.id}
                title={notification.title}
                message={notification.message}
                linkUrl={notification.linkUrl}
                priority={notification.priority}
                isRead={notification.isRead}
                createdAt={notification.createdAt}
                triggeredBy={notification.triggeredBy}
                onRead={onClose}
              />
            ))}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
