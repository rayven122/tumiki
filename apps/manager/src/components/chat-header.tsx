"use client";

import { useParams } from "next/navigation";

import { ModelSelector } from "@/components/model-selector";
import { ChatHistoryDropdown } from "@/app/[orgSlug]/_components/ChatHistoryDropdown";
import { memo, useCallback } from "react";
import { type VisibilityType, VisibilitySelector } from "./visibility-selector";
import { McpServerSelector } from "./mcp-server-selector";
import type { SessionData } from "~/auth";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { Button } from "./ui/chat/button";
import { CopyIcon } from "./icons";
import { toast } from "./toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/chat/tooltip";

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  selectedMcpServerIds,
  isReadonly,
  session,
  organizationId,
  isPersonalOrg,
  isNewChat = false,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  selectedMcpServerIds: string[];
  isReadonly: boolean;
  session: SessionData;
  organizationId: string;
  isPersonalOrg: boolean;
  isNewChat?: boolean;
}) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

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

  return (
    <header className="bg-background sticky top-0 flex items-center gap-2 px-2 py-1.5 md:px-2">
      {/* モデル選択 */}
      {!isReadonly && (
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="order-1"
        />
      )}

      {/* MCPサーバー選択 */}
      {!isReadonly && (
        <McpServerSelector
          selectedMcpServerIds={selectedMcpServerIds}
          className="order-2"
        />
      )}

      {/* 公開設定（新規チャットの場合は非表示） */}
      {!isReadonly && !isNewChat && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          organizationId={organizationId}
          isPersonalOrg={isPersonalOrg}
          className="order-3"
        />
      )}

      {/* 公開リンクコピーボタン（公開設定の場合のみ表示） */}
      {!isReadonly && !isNewChat && visibilityType === "PUBLIC" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="copy-share-link"
              variant="outline"
              size="icon"
              onClick={handleCopyShareLink}
              className="order-4 hidden h-[34px] w-[34px] md:flex"
            >
              <CopyIcon size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">公開リンクをコピー</TooltipContent>
        </Tooltip>
      )}

      {/* 新規チャット・履歴 */}
      <div className="order-5 ml-auto">
        <ChatHistoryDropdown
          orgSlug={orgSlug}
          organizationId={organizationId}
          currentUserId={session.user?.id ?? ""}
        />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
