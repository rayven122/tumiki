import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

type ChatLayoutProps = {
  children: ReactNode;
};

// チャット画面のレイアウト
// 親の[orgSlug]/layout.tsxでOrgSidebar/SimpleHeaderが提供されるため、
// ここではチャット固有の設定（TooltipProviderなど）のみを追加
export default function ChatLayout({ children }: ChatLayoutProps) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
