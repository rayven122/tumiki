"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { ChevronDownIcon, HistoryIcon, UsersIcon } from "@/components/icons";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";

import { Popover, PopoverContent, PopoverTrigger } from "@tumiki/ui/popover";
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
import { LoaderIcon } from "@/components/icons";
import type { ChatWithUser, ChatHistory, GroupedChats } from "@/lib/types/chat";

const PAGE_SIZE = 20;

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

/**
 * チャット履歴のページネーションキーを生成
 * organizationId は外部から渡す必要があるため、クロージャで取得
 */
const getChatHistoryPaginationKey =
  (organizationId: string) =>
  (pageIndex: number, previousPageData: ChatHistory | null) => {
    if (previousPageData?.hasMore === false) {
      return null;
    }

    if (pageIndex === 0)
      return `/api/history?limit=${PAGE_SIZE}&organization_id=${organizationId}`;

    const firstChatFromPage = previousPageData?.chats.at(-1);

    if (!firstChatFromPage) return null;

    return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}&organization_id=${organizationId}`;
  };

type ChatHistoryDropdownProps = {
  chatId: string;
  orgSlug: string;
  organizationId: string;
  currentUserId: string;
  isNewChat?: boolean;
  /** アバターモード用。trueの場合、リンクは /avatar/[id] になる */
  avatarMode?: boolean;
};

export const ChatHistoryDropdown = ({
  chatId,
  orgSlug,
  organizationId,
  currentUserId,
  isNewChat = false,
  avatarMode = false,
}: ChatHistoryDropdownProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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
      fallbackData: [],
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
    setIsOpen(false);
    const basePath = avatarMode ? `/${orgSlug}/avatar` : `/${orgSlug}/chat`;
    router.push(basePath);
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
                href={
                  avatarMode
                    ? `/${orgSlug}/avatar/${chat.id}`
                    : `/${orgSlug}/chat/${chat.id}`
                }
                className="min-w-0 flex-1"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-start gap-2">
                  {chat.agent && (
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
                    <span className="truncate text-sm">
                      {chat.title || "新しいチャット"}
                    </span>
                    {chat.agent ? (
                      <span className="text-muted-foreground truncate text-xs">
                        {chat.agent.name}
                      </span>
                    ) : (
                      isOrganizationShared &&
                      chat.user.name && (
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
              {isOwner && (
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
      <div className="flex items-center gap-1">
        {/* 新規チャットボタン（既存チャット画面のみ表示） */}
        {chatId && !isNewChat && (
          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <Plus className="mr-1 h-4 w-4" />
            新規チャット
          </Button>
        )}

        {/* 履歴ドロップダウン */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground md:h-[34px] md:px-2"
            >
              <HistoryIcon />
              履歴
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-sm font-medium">チャット履歴</span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <LoaderIcon />
                  </div>
                </div>
              ) : hasEmptyChatHistory ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  チャット履歴がありません
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
          </PopoverContent>
        </Popover>
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
