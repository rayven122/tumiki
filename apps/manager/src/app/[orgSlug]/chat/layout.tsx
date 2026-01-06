import Script from "next/script";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

type ChatLayoutProps = {
  children: ReactNode;
};

// チャット画面のレイアウト
// 親の[orgSlug]/layout.tsxでOrgSidebar/SimpleHeaderが提供されるため、
// ここではチャット固有の設定（Pyodide、TooltipProviderなど）のみを追加
export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <TooltipProvider>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      {children}
    </TooltipProvider>
  );
}
