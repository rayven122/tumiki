"use client";

import { useParams } from "next/navigation";

import { ModelSelector } from "@/components/model-selector";
import { ChatHistoryDropdown } from "@/app/[orgSlug]/_components/ChatHistoryDropdown";
import { memo } from "react";
import { type VisibilityType, VisibilitySelector } from "./visibility-selector";
import type { SessionData } from "~/auth";

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: SessionData;
}) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

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

      {/* 公開設定 */}
      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-2"
        />
      )}

      {/* 新規チャット・履歴 */}
      <div className="order-3 ml-auto">
        <ChatHistoryDropdown orgSlug={orgSlug} />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
