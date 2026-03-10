"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Users,
  ChevronLeft,
  MessageSquare,
  List,
  Network,
  Bot,
  Sparkles,
} from "lucide-react";
import { useAtom } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebarActions } from "@/hooks/useSidebarActions";
import { isEEFeatureAvailable } from "@/features/ee";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { ChatHistoryList } from "@/features/chat";

type OrgSidebarProps = {
  orgSlug: string;
  isPersonal: boolean;
  organizationId: string;
  currentUserId: string;
  isAdmin: boolean;
};

export const OrgSidebar = ({
  orgSlug,
  isPersonal,
  organizationId,
  currentUserId,
  isAdmin,
}: OrgSidebarProps) => {
  const pathname = usePathname();
  const params = useParams();
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom);

  // カスタムフックでモバイル判定とサイドバー操作を管理
  const isMobile = useIsMobile();
  const { closeSidebar } = useSidebarActions(isMobile, setIsOpen);

  // チャット画面かどうかを判定
  // pathname はエンコード済み（%40など）、orgSlug はデコード済み（@など）なのでデコードして比較
  const decodedPathname = decodeURIComponent(pathname);
  const isChatPage =
    decodedPathname.startsWith(`/${orgSlug}/chat`) ||
    decodedPathname.startsWith(`/${orgSlug}/avatar`);

  // 現在のチャットIDを取得（/chat/[id] または /avatar/[id] の場合）
  // 型ガードで安全に取得
  const chatId =
    typeof params.id === "string" && params.id.length > 0
      ? params.id
      : undefined;

  const navigation = [
    {
      name: "ダッシュボード",
      href: `/${orgSlug}/dashboard`,
      icon: LayoutDashboard,
      show: true, // 全組織で表示
      disabled: false,
    },
    {
      name: "AIエージェント",
      href: `/${orgSlug}/agents`,
      icon: Bot,
      show: true, // 全組織で表示
      disabled: false,
      beta: true,
    },
    {
      name: "AIチャット",
      href: `/${orgSlug}/chat`,
      icon: Sparkles,
      show: true, // 全組織で表示
      disabled: false,
      beta: true,
    },
    {
      name: "MCP",
      href: `/${orgSlug}/mcps`,
      icon: List,
      show: true, // 全組織で表示
      disabled: false,
    },
    // {
    //   name: "アクティビティ",
    //   href: `/${orgSlug}/activity`,
    //   icon: Activity,
    //   show: true, // 全組織で表示
    //   disabled: true,
    //   comingSoon: true,
    // },
    {
      name: "メンバー管理",
      href: `/${orgSlug}/members`,
      icon: Users,
      // 個人組織では非表示、管理者のみ表示、EE機能が有効な場合のみ表示
      show: !isPersonal && isAdmin && isEEFeatureAvailable("member-management"),
      disabled: false,
    },
    {
      name: "組織構造",
      href: `/${orgSlug}/org-structure`,
      icon: Network,
      // 個人組織では非表示、管理者のみ表示、EE機能が有効な場合のみ表示
      show: !isPersonal && isAdmin && isEEFeatureAvailable("group-management"),
      disabled: false,
      beta: true,
    },
    {
      name: "設定",
      href: `/${orgSlug}/settings`,
      icon: Settings,
      show: true, // 全組織で表示（Slack連携など）
      disabled: false,
    },
    {
      name: "フィードバック",
      href: `/${orgSlug}/feedback`,
      icon: MessageSquare,
      show: true, // 全ユーザーに表示
      disabled: false,
    },
  ].filter((item) => item.show);

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* サイドバー */}
      <aside
        className={cn(
          "bg-background flex flex-col border-r transition-all duration-300",
          // モバイル: fixed配置、スライドイン/アウト、画面全体の高さ
          "fixed inset-y-0 left-0 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // デスクトップ: fixed配置、ヘッダーの下から画面下まで、常に表示
          "md:bg-muted/40 md:fixed md:top-14 md:bottom-0 md:translate-x-0",
          isOpen ? "w-64" : "w-64 md:w-16",
        )}
      >
        {/* モバイル用ヘッダー */}
        <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <span className="font-bold">メニュー</span>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-accent rounded-lg p-2 transition-colors"
            aria-label="メニューを閉じる"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ナビゲーション */}
          <div className="py-6">
            <TooltipProvider delayDuration={300}>
              <nav className="grid gap-1 px-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = decodedPathname === item.href;
                  const isDisabled = item.disabled;
                  const isBeta = "beta" in item && item.beta;
                  const tooltipText =
                    "comingSoon" in item && item.comingSoon
                      ? "近日公開"
                      : item.name;

                  const linkContent = (
                    <>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={cn("md:inline", !isOpen && "md:hidden")}>
                        {item.name}
                      </span>
                      {isBeta && isOpen && (
                        <span className="bg-primary/10 text-primary ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium">
                          Beta
                        </span>
                      )}
                    </>
                  );

                  if (isDisabled) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "text-muted-foreground/40 flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                            )}
                          >
                            {linkContent}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  const linkElement = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground",
                      )}
                      onClick={() => {
                        // モバイルではリンククリック時にサイドバーを閉じる
                        if (isMobile) {
                          setIsOpen(false);
                        }
                      }}
                    >
                      {linkContent}
                    </Link>
                  );

                  // サイドバーが閉じている時はツールチップを表示
                  if (!isOpen) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkElement;
                })}
              </nav>
            </TooltipProvider>
          </div>

          {/* チャット履歴セクション（チャット画面時のみ表示） */}
          {isChatPage && (
            <div className="flex flex-1 flex-col overflow-hidden border-t">
              {isOpen && (
                <div className="text-muted-foreground px-4 pt-4 pb-2 text-xs font-medium">
                  チャット履歴
                </div>
              )}
              <ChatHistoryList
                chatId={chatId}
                orgSlug={orgSlug}
                organizationId={organizationId}
                currentUserId={currentUserId}
                isSidebarOpen={isOpen}
                onSidebarClose={closeSidebar}
              />
            </div>
          )}
        </div>
      </aside>

      {/* トグルボタン（デスクトップのみ） - 画面左下に固定配置 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "hover:bg-accent fixed bottom-4 z-50 hidden rounded-lg p-2 transition-all duration-300 md:block",
          isOpen ? "left-[200px]" : "left-4",
        )}
        aria-label={isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
      >
        <ChevronLeft
          className={cn(
            "h-5 w-5 transition-transform duration-300",
            !isOpen && "rotate-180",
          )}
        />
      </button>
    </>
  );
};
