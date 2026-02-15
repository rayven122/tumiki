"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@tumiki/ui/avatar";
import { Button } from "@tumiki/ui/button";
import { Checkbox } from "@tumiki/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tumiki/ui/dialog";
import { UserPlus } from "lucide-react";

type OrganizationMember = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  initials: string;
};

type AddMembersDialogProps = {
  organizationMembers: OrganizationMember[];
  currentGroupMemberIds: string[];
  onAddMembers: (userIds: string[]) => void;
  isAdding: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const AddMembersDialog = ({
  organizationMembers,
  currentGroupMemberIds,
  onAddMembers,
  isAdding,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddMembersDialogProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 制御モードか非制御モードかを判定
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isControlled
    ? (open: boolean) => controlledOnOpenChange?.(open)
    : setInternalIsOpen;

  // グループに未所属のメンバーのみ表示
  const availableMembers = organizationMembers.filter(
    (member) => !currentGroupMemberIds.includes(member.id),
  );

  // ダイアログが閉じたら選択をリセット
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserIds([]);
    }
  }, [isOpen]);

  const handleCheckChange = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => [...prev, userId]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === availableMembers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableMembers.map((m) => m.id));
    }
  };

  const handleSubmit = () => {
    if (selectedUserIds.length > 0) {
      onAddMembers(selectedUserIds);
      // 親が制御している場合は親がonSuccessで閉じる
      // 非制御の場合はここで閉じる（後方互換性のため）
      if (!isControlled) {
        setSelectedUserIds([]);
        setIsOpen(false);
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-dashed"
        >
          <UserPlus className="h-4 w-4" />
          メンバーを追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            メンバーを追加
          </DialogTitle>
          <DialogDescription>
            グループに追加するメンバーを選択してください
          </DialogDescription>
        </DialogHeader>

        {availableMembers.length === 0 ? (
          <div className="bg-muted/30 flex flex-col items-center gap-2 rounded-lg py-10 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <UserPlus className="text-muted-foreground h-6 w-6" />
            </div>
            <p className="text-muted-foreground text-sm">
              追加可能なメンバーがいません
            </p>
            <p className="text-muted-foreground text-xs">
              組織にメンバーを追加してからお試しください
            </p>
          </div>
        ) : (
          <>
            <div className="bg-muted/30 flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-sm">
                <span className="text-primary font-medium">
                  {selectedUserIds.length}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  / {availableMembers.length} 人選択中
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs"
              >
                {selectedUserIds.length === availableMembers.length
                  ? "選択解除"
                  : "すべて選択"}
              </Button>
            </div>

            <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-1">
              {availableMembers.map((member) => {
                const isSelected = selectedUserIds.includes(member.id);

                return (
                  <label
                    key={member.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleCheckChange(member.id, checked === true)
                      }
                    />
                    <Avatar className="h-9 w-9">
                      {member.avatarUrl && (
                        <AvatarImage src={member.avatarUrl} />
                      )}
                      <AvatarFallback className="text-xs">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.name}</span>
                      {member.email && (
                        <span className="text-muted-foreground text-xs">
                          {member.email}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedUserIds.length === 0 || isAdding}
            className="min-w-[120px]"
          >
            {isAdding ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                追加中...
              </>
            ) : selectedUserIds.length > 0 ? (
              `${selectedUserIds.length}人を追加`
            ) : (
              "選択してください"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
