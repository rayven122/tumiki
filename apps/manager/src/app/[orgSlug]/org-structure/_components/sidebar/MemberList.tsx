"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, UserMinus, Loader2, MoreVertical } from "lucide-react";
import type { Member } from "@/features/org-structure/utils/mock/mockOrgData";

type MemberListProps = {
  members: Member[];
  leaderId: string;
  canEdit: boolean;
  onRemoveMember: (userId: string) => void;
  onLeaderChange?: (userId: string) => void;
  isRemoving: boolean;
  isUpdatingLeader?: boolean;
};

export const MemberList = ({
  members,
  leaderId,
  canEdit,
  onRemoveMember,
  onLeaderChange,
  isRemoving,
  isUpdatingLeader,
}: MemberListProps) => {
  if (members.length === 0) {
    return null;
  }

  // リーダーを先頭に並べ替え
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === leaderId) return -1;
    if (b.id === leaderId) return 1;
    return 0;
  });

  return (
    <div className="space-y-2.5">
      {sortedMembers.map((member) => {
        const isLeader = member.id === leaderId;

        return (
          <div
            key={member.id}
            className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              isLeader ? "border-amber-200 bg-amber-50/50" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <Avatar
                className={`h-10 w-10 shrink-0 ${isLeader ? "ring-2 ring-amber-500/30" : ""}`}
              >
                {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                <AvatarFallback
                  className={`text-xs ${isLeader ? "bg-amber-100 text-amber-700" : ""}`}
                >
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">
                  {member.name}
                </span>
                {isLeader && (
                  <span className="flex w-fit shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    <Crown className="h-3 w-3" />
                    部門長
                  </span>
                )}
              </div>
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground ml-2 h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    disabled={isRemoving || isUpdatingLeader}
                  >
                    {isRemoving || isUpdatingLeader ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isLeader && onLeaderChange && (
                    <DropdownMenuItem
                      onClick={() => onLeaderChange(member.id)}
                      className="gap-2"
                    >
                      <Crown className="h-4 w-4 text-amber-500" />
                      部門長に設定
                    </DropdownMenuItem>
                  )}
                  {!isLeader && (
                    <DropdownMenuItem
                      onClick={() => onRemoveMember(member.id)}
                      className="gap-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      メンバーから削除
                    </DropdownMenuItem>
                  )}
                  {isLeader && (
                    <DropdownMenuItem
                      disabled
                      className="text-muted-foreground"
                    >
                      部門長は削除できません
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
};
