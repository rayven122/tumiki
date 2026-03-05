"use client";

/**
 * 受付モード クイックアクションボタン
 * 来訪者がよく使う操作をワンタップで実行できるショートカット
 */

import { memo } from "react";
import {
  UserCheck,
  MapPin,
  Phone,
  HelpCircle,
  CalendarCheck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type QuickAction = {
  icon: React.ReactNode;
  label: string;
  message: string;
};

// 受付でよく使われるアクション
const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <UserCheck className="h-5 w-5" />,
    label: "来訪受付",
    message: "来訪の受付をお願いします。",
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    label: "フロア案内",
    message: "フロアの案内をお願いします。",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    label: "担当者呼出",
    message: "担当者を呼び出してください。",
  },
  {
    icon: <CalendarCheck className="h-5 w-5" />,
    label: "予約確認",
    message: "本日の予約を確認したいです。",
  },
  {
    icon: <Package className="h-5 w-5" />,
    label: "配達・荷物",
    message: "配達の荷物があります。",
  },
  {
    icon: <HelpCircle className="h-5 w-5" />,
    label: "その他",
    message: "その他のご用件があります。",
  },
];

type ReceptionQuickActionsProps = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  disabled?: boolean;
  chatId: string;
  orgSlug: string;
  /** カスタムアクション（省略時はデフォルト） */
  actions?: QuickAction[];
};

const PureReceptionQuickActions = ({
  sendMessage,
  disabled = false,
  chatId,
  orgSlug,
  actions = DEFAULT_QUICK_ACTIONS,
}: ReceptionQuickActionsProps) => {
  const handleAction = (action: QuickAction) => {
    if (disabled) return;

    // URLを更新（新規チャット時にIDを付与）
    window.history.replaceState({}, "", `/${orgSlug}/reception/${chatId}`);

    void sendMessage({
      role: "user",
      parts: [{ type: "text", text: action.message }],
    });
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => handleAction(action)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 rounded-2xl px-4 py-2.5",
            "border border-white/20 bg-black/30 backdrop-blur-md",
            "text-sm text-white transition-all",
            "hover:bg-white/20 active:scale-95",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export const ReceptionQuickActions = memo(PureReceptionQuickActions);
