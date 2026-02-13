"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/chat/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/chat/tooltip";
import {
  VisibilitySelector,
  type VisibilityType,
} from "@/components/visibility-selector";
import { toast } from "@/components/toast";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useCallback } from "react";

type ChatQuickActionsProps = {
  chatId: string;
  organizationId: string;
  isPersonalOrg: boolean;
  selectedVisibilityType: VisibilityType;
  isNewChat?: boolean;
  isReadonly?: boolean;
};

export const ChatQuickActions = ({
  chatId,
  organizationId,
  isPersonalOrg,
  selectedVisibilityType,
  isNewChat = false,
  isReadonly = false,
}: ChatQuickActionsProps) => {
  // 現在の公開設定を取得
  const { visibilityType } = useChatVisibility({
    chatId,
    initialVisibilityType: selectedVisibilityType,
    organizationId,
  });

  // 公開リンクをコピー
  const handleCopyShareLink = useCallback(async () => {
    const shareUrl = `${window.location.origin}/share/${chatId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        type: "success",
        description: "公開リンクをコピーしました",
      });
    } catch {
      toast({
        type: "error",
        description: "リンクのコピーに失敗しました",
      });
    }
  }, [chatId]);

  // 新規チャットまたは読み取り専用の場合は何も表示しない
  if (isNewChat || isReadonly) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* 公開設定 */}
      <VisibilitySelector
        chatId={chatId}
        selectedVisibilityType={selectedVisibilityType}
        organizationId={organizationId}
        isPersonalOrg={isPersonalOrg}
      />

      {/* 公開リンクコピーボタン（公開設定の場合のみ表示） */}
      {visibilityType === "PUBLIC" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="copy-share-link"
              variant="outline"
              size="sm"
              onClick={handleCopyShareLink}
              className="gap-1.5"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">公開リンク</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">公開リンクをコピー</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
