"use client";

import { type ReactNode, useMemo, useState } from "react";
import type { McpServerVisibility } from "@tumiki/db";
import { Button } from "@tumiki/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tumiki/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
  UsersIcon,
} from "./icons";
import { useChatVisibility } from "@/hooks/use-chat-visibility";

export type VisibilityType = McpServerVisibility;

const visibilities: Array<{
  id: VisibilityType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "PRIVATE",
    label: "非公開",
    description: "あなただけがこのチャットにアクセスできます",
    icon: <LockIcon />,
  },
  {
    id: "ORGANIZATION",
    label: "組織内共有",
    description: "組織のメンバーがアクセス・編集できます",
    icon: <UsersIcon />,
  },
  {
    id: "PUBLIC",
    label: "公開",
    description: "リンクを知っている人は誰でもアクセスできます",
    icon: <GlobeIcon />,
  },
];

export function VisibilitySelector({
  chatId,
  className,
  selectedVisibilityType,
  organizationId,
  isPersonalOrg = false,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  organizationId: string;
  isPersonalOrg?: boolean;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId,
    initialVisibilityType: selectedVisibilityType,
    organizationId,
  });

  // 個人組織の場合は「組織内共有」オプションを除外
  const availableVisibilities = useMemo(
    () =>
      isPersonalOrg
        ? visibilities.filter((v) => v.id !== "ORGANIZATION")
        : visibilities,
    [isPersonalOrg],
  );

  const selectedVisibility = useMemo(
    () =>
      availableVisibilities.find(
        (visibility) => visibility.id === visibilityType,
      ),
    [availableVisibilities, visibilityType],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit",
          className,
        )}
      >
        <Button
          data-testid="visibility-selector"
          variant="outline"
          className="hidden md:flex md:h-[34px] md:px-2"
        >
          {selectedVisibility?.icon}
          {selectedVisibility?.label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[300px]">
        {availableVisibilities.map((visibility) => (
          <DropdownMenuItem
            data-testid={`visibility-selector-item-${visibility.id}`}
            key={visibility.id}
            onSelect={() => {
              setVisibilityType(visibility.id);
              setOpen(false);
            }}
            className="group/item flex flex-row items-center justify-between gap-4"
            data-active={visibility.id === visibilityType}
          >
            <div className="flex flex-col items-start gap-1">
              {visibility.label}
              {visibility.description && (
                <div className="text-muted-foreground text-xs">
                  {visibility.description}
                </div>
              )}
            </div>
            <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
              <CheckCircleFillIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
