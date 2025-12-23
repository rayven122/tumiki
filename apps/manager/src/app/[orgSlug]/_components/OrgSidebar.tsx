"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  ChevronLeft,
  Activity,
  MessageSquare,
  List,
  Plus,
  Network,
} from "lucide-react";
import { useAtom } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OrgSidebarProps = {
  orgSlug: string;
  isPersonal: boolean;
};

export const OrgSidebar = ({ orgSlug, isPersonal }: OrgSidebarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom);
  const [isMobile, setIsMobile] = useState(false);

  // モバイル判定とリサイズイベントリスナーの管理
  useEffect(() => {
    // 初期状態の設定
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 初回実行
    checkMobile();

    // リサイズイベントリスナーを登録
    window.addEventListener("resize", checkMobile);

    // クリーンアップ関数でリスナーを削除
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const navigation = [
    {
      name: "ダッシュボード",
      href: `/${orgSlug}/dashboard`,
      icon: LayoutDashboard,
      show: !isPersonal, // 個人組織では非表示
      disabled: true,
      comingSoon: true,
    },
    {
      name: "登録済みサーバー",
      href: `/${orgSlug}/mcps`,
      icon: List,
      show: true, // 全組織で表示
      disabled: false,
    },
    {
      name: "MCPサーバーを作成",
      href: `/${orgSlug}/mcps/create`,
      icon: Plus,
      show: true, // 全組織で表示
      disabled: false,
    },
    {
      name: "アクティビティ",
      href: `/${orgSlug}/activity`,
      icon: Activity,
      show: true, // 全組織で表示
      disabled: true,
      comingSoon: true,
    },
    {
      name: "組織構造",
      href: `/${orgSlug}/org-structure`,
      icon: Network,
      show: !isPersonal, // 個人組織では非表示
      disabled: false,
    },
    {
      name: "メンバー管理",
      href: `/${orgSlug}/members`,
      icon: Users,
      show: !isPersonal, // 個人組織では非表示
      disabled: false,
    },

    {
      name: "ロール・権限",
      href: `/${orgSlug}/roles`,
      icon: Shield,
      show: !isPersonal, // 個人組織では非表示
      disabled: false,
    },
    {
      name: "設定",
      href: `/${orgSlug}/settings`,
      icon: Settings,
      show: !isPersonal, // 個人組織では非表示
      disabled: true,
      comingSoon: true,
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

        <div className="flex-1 overflow-auto py-6">
          <TooltipProvider delayDuration={300}>
            <nav className="grid gap-1 px-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isDisabled = item.disabled;
                const tooltipText = item.comingSoon ? "近日公開" : item.name;

                const linkContent = (
                  <>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={cn("md:inline", !isOpen && "md:hidden")}>
                      {item.name}
                    </span>
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
