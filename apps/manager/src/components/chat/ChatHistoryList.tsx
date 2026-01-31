"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { UsersIcon, LoaderIcon } from "@/components/icons";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";

import { Button } from "@/components/ui/chat/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/chat/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "チャットを削除中...",
      success: () => {
        void mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });

        return "チャットを削除しました";
      },
      error: "チャットの削除に失敗しました",
    });

    setShowDeleteDialog(false);

    if (deleteId === chatId) {
      router.push(`/${orgSlug}/chat`);
    }
  };

  const handleNewChat = () => {
    onSidebarClose?.();
    router.push(`/${orgSlug}/chat`);
    router.refresh();
  };

  const chatsFromHistory =
    paginatedChatHistories?.flatMap((page) => page.chats) ?? [];
  const groupedChats = groupChatsByDate(chatsFromHistory);

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
                <div className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "truncate text-sm",
                      !isSidebarOpen && "hidden",
                    )}
                  >
                    {chat.title || "新しいチャット"}
                  </span>
                  {isOrganizationShared && chat.user.name && isSidebarOpen && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <UsersIcon size={10} />
                      {chat.user.name}
                    </span>
                  )}
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

      {/* チャット履歴リスト */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          </div>
        ) : hasEmptyChatHistory ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {isSidebarOpen ? "チャット履歴がありません" : ""}
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
