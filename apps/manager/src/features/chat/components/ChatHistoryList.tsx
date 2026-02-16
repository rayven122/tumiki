"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2, Bot, MessageSquare } from "lucide-react";
import { UsersIcon, LoaderIcon } from "@/components/icons";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";

import { Button } from "@tumiki/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tumiki/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tumiki/ui/dropdown-menu";
import { cn, fetcher } from "@/lib/utils";
import type { ChatWithUser, ChatHistory, GroupedChats } from "@/lib/types/chat";
import { getChatHistoryPaginationKey } from "@/components/sidebar-history";

const groupChatsByDate = (chats: ChatWithUser[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

type ChatHistoryListProps = {
  chatId?: string;
  orgSlug: string;
  organizationId: string;
  currentUserId: string;
  isSidebarOpen: boolean;
  onSidebarClose?: () => void;
};

/** チャットフィルタータイプ */
type ChatFilter = "agent" | "normal";

export const ChatHistoryList = ({
  chatId,
  orgSlug,
  organizationId,
  currentUserId,
  isSidebarOpen,
  onSidebarClose,
}: ChatHistoryListProps) => {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filter, setFilter] = useState<ChatFilter>("normal");

  const {
    data: paginatedChatHistories,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(
    getChatHistoryPaginationKey(organizationId),
    fetcher,
    {
      fallbackData: [] as ChatHistory[],
    },
  );

  const handleDelete = async () => {
    if (!deleteId) return;

    setShowDeleteDialog(false);

    try {
      const response = await fetch(`/api/chat?id=${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`削除に失敗しました: ${response.status}`);
      }

      // キャッシュを更新
      await mutate((chatHistories) => {
        if (chatHistories) {
          return chatHistories.map((chatHistory) => ({
            ...chatHistory,
            chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
          }));
        }
        return chatHistories;
      });

      toast.success("チャットを削除しました");

      // 削除したチャットを表示中だった場合は新規チャット画面へ遷移
      if (deleteId === chatId) {
        router.push(`/${orgSlug}/chat`);
      }
    } catch (error) {
      console.error("チャット削除エラー:", error);
      toast.error("チャットの削除に失敗しました");
    }
  };

  const handleNewChat = () => {
    onSidebarClose?.();
    router.push(`/${orgSlug}/chat`);
    router.refresh();
  };

  const chatsFromHistory =
    paginatedChatHistories?.flatMap((page) => page.chats) ?? [];
  // フィルター適用
  const filteredChats = chatsFromHistory.filter((chat) =>
    filter === "agent" ? chat.agent !== null : chat.agent === null,
  );
  const groupedChats = groupChatsByDate(filteredChats);

  const renderChatGroup = (title: string, chats: ChatWithUser[]) => {
    if (chats.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="text-muted-foreground mb-1 px-2 text-xs font-medium">
          {title}
        </div>
        {chats.map((chat) => {
          const isOwner = chat.userId === currentUserId;
          const isOrganizationShared =
            chat.visibility === "ORGANIZATION" && !isOwner;

          return (
            <div
              key={chat.id}
              className={cn(
                "group hover:bg-accent flex items-center justify-between rounded-md px-2 py-1.5",
                chat.id === chatId && "bg-accent",
              )}
            >
              <Link
                href={`/${orgSlug}/chat/${chat.id}`}
                className="min-w-0 flex-1"
                onClick={onSidebarClose}
              >
                <div className="flex items-start gap-2">
                  {chat.agent && isSidebarOpen && (
                    <div className="mt-0.5 shrink-0">
                      <EntityIcon
                        iconPath={chat.agent.iconPath}
                        type="agent"
                        size="xs"
                        alt={chat.agent.name}
                      />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        "truncate text-sm",
                        !isSidebarOpen && "hidden",
                      )}
                    >
                      {chat.title || "新しいチャット"}
                    </span>
                    {chat.agent && isSidebarOpen ? (
                      <span className="text-muted-foreground truncate text-xs">
                        {chat.agent.name}
                      </span>
                    ) : (
                      isOrganizationShared &&
                      chat.user.name &&
                      isSidebarOpen && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <UsersIcon size={10} />
                          {chat.user.name}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </Link>
              {/* 自分のチャットのみ削除可能 */}
              {isOwner && isSidebarOpen && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setDeleteId(chat.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* 新規チャットボタン */}
      <div className="px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start gap-2",
            !isSidebarOpen && "justify-center px-2",
          )}
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          {isSidebarOpen && <span>新規チャット</span>}
        </Button>
      </div>

      {/* フィルタータブ */}
      {isSidebarOpen && (
        <div className="flex gap-1 px-4 pb-2">
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              filter === "normal"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={() => setFilter("normal")}
          >
            <MessageSquare className="h-3 w-3" />
            Chat
          </button>
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              filter === "agent"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={() => setFilter("agent")}
          >
            <Bot className="h-3 w-3" />
            Agent
          </button>
        </div>
      )}

      {/* チャット履歴リスト */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {isSidebarOpen
              ? filter === "agent"
                ? "エージェントチャットがありません"
                : "普通のチャットがありません"
              : ""}
          </div>
        ) : (
          <>
            {renderChatGroup("今日", groupedChats.today)}
            {renderChatGroup("昨日", groupedChats.yesterday)}
            {renderChatGroup("過去7日間", groupedChats.lastWeek)}
            {renderChatGroup("過去30日間", groupedChats.lastMonth)}
            {renderChatGroup("それ以前", groupedChats.older)}
          </>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。チャットは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
