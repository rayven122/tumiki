import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/features/chat/components/Sidebar";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@tumiki/ui/dropdown-menu";
import {
  BotIcon,
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  ShareIcon,
  TrashIcon,
  UsersIcon,
} from "./icons";
import { memo } from "react";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { ChatWithUser } from "@/lib/types/chat";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
  orgSlug,
  currentUserId,
  organizationId,
}: {
  chat: ChatWithUser;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  orgSlug: string;
  currentUserId: string;
  organizationId: string;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibilityType: chat.visibility,
    organizationId,
  });

  const isOwner = chat.userId === currentUserId;
  const isOrganizationShared = chat.visibility === "ORGANIZATION" && !isOwner;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link
          href={`/${orgSlug}/chat/${chat.id}`}
          onClick={() => setOpenMobile(false)}
        >
          <div className="flex items-start gap-2">
            {chat.agent && (
              <div className="text-muted-foreground mt-0.5 shrink-0">
                <BotIcon />
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate">{chat.title}</span>
              {chat.agent ? (
                <span className="text-muted-foreground truncate text-xs">
                  {chat.agent.name}
                </span>
              ) : (
                isOrganizationShared &&
                chat.user.name && (
                  <span className="text-muted-foreground text-xs">
                    {chat.user.name}
                  </span>
                )
              )}
            </div>
          </div>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          {/* 自分のチャットのみ visibility 変更可能 */}
          {isOwner && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <ShareIcon />
                <span>共有設定</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    className="cursor-pointer flex-row justify-between"
                    onClick={() => {
                      setVisibilityType("PRIVATE");
                    }}
                  >
                    <div className="flex flex-row items-center gap-2">
                      <LockIcon size={12} />
                      <span>非公開</span>
                    </div>
                    {visibilityType === "PRIVATE" ? (
                      <CheckCircleFillIcon />
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex-row justify-between"
                    onClick={() => {
                      setVisibilityType("ORGANIZATION");
                    }}
                  >
                    <div className="flex flex-row items-center gap-2">
                      <UsersIcon size={12} />
                      <span>組織内共有</span>
                    </div>
                    {visibilityType === "ORGANIZATION" ? (
                      <CheckCircleFillIcon />
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex-row justify-between"
                    onClick={() => {
                      setVisibilityType("PUBLIC");
                    }}
                  >
                    <div className="flex flex-row items-center gap-2">
                      <GlobeIcon size={12} />
                      <span>公開</span>
                    </div>
                    {visibilityType === "PUBLIC" ? (
                      <CheckCircleFillIcon />
                    ) : null}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          {/* 自分のチャットのみ削除可能 */}
          {isOwner && (
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/15 focus:text-destructive cursor-pointer dark:text-red-500"
              onSelect={() => onDelete(chat.id)}
            >
              <TrashIcon />
              <span>削除</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.chat.visibility !== nextProps.chat.visibility) return false;
  if (prevProps.chat.agent?.id !== nextProps.chat.agent?.id) return false;
  return true;
});
