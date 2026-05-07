"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  ExternalLink,
  History,
  Link2,
  PanelLeft,
  PanelLeftClose,
  Server,
  Settings,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Theme } from "~/lib/admin-theme";
import { api } from "~/trpc/react";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { path: "/admin", label: "ダッシュボード", icon: Activity },
      { path: "/admin/history", label: "操作履歴", icon: History },
    ],
  },
  {
    heading: "ディレクトリ",
    items: [
      { path: "/admin/directory", label: "組織・グループ", icon: Building2 },
      {
        path: "/admin/users",
        label: "ユーザー",
        icon: User,
        matchPrefix: true,
      },
    ],
  },
  {
    heading: "アクセス制御",
    items: [
      {
        path: "/admin/roles",
        label: "ロール",
        icon: Shield,
        matchPrefix: true,
      },
      {
        path: "/admin/assignments",
        label: "割り当て",
        icon: Link2,
        matchPrefix: true,
      },
    ],
  },
  {
    heading: "プラットフォーム",
    items: [
      { path: "/admin/tools", label: "カタログ管理", icon: Server },
      { path: "/admin/settings", label: "システム設定", icon: Settings },
    ],
  },
];

const isItemActive = (item: NavItem, pathname: string) =>
  pathname === item.path ||
  (item.matchPrefix === true && pathname.startsWith(`${item.path}/`));

type Props = {
  initialTheme: Theme;
};

export const AdminSidebar = ({ initialTheme }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: desktopSettings } = api.desktopApiSettings.get.useQuery();
  const sidebarLogoUrl =
    desktopSettings?.organizationLogoUrl ?? "/tumiki-logo.svg";
  const sidebarTitle = desktopSettings?.organizationName ?? "Tumiki";

  return (
    <aside
      className={`border-r-border-default bg-bg-app flex min-h-screen shrink-0 flex-col border-r py-3 transition-all duration-200 ${collapsed ? "w-16" : "w-[236px]"}`}
    >
      {/* ロゴ + 折りたたみボタン */}
      <div className="border-b-border-default flex items-center justify-between border-b px-3 pb-3">
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2">
            <div className="border-border-default bg-bg-card flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
              <img
                src={sidebarLogoUrl}
                alt=""
                className="h-5 w-5 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-text-primary truncate text-sm font-semibold">
                {sidebarTitle}
              </div>
              <div className="text-text-subtle truncate text-[10px]">
                Tumiki Manager
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className={`text-text-muted hover:bg-bg-active hover:text-text-primary rounded-md p-1.5 transition-colors ${collapsed ? "mx-auto" : "ml-auto"}`}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ナビゲーション */}
      <nav
        className="flex-1 overflow-y-auto px-2 pt-2"
        aria-label="管理画面ナビゲーション"
      >
        {NAV_SECTIONS.map((section, index) => (
          <div
            key={section.heading ?? `section-${index}`}
            className={index === 0 ? "" : "mt-3"}
          >
            {section.heading && !collapsed ? (
              <div className="text-text-subtle px-2.5 pt-1 pb-1 text-[10px] font-medium tracking-wide uppercase">
                {section.heading}
              </div>
            ) : null}
            {section.heading && collapsed ? (
              <div
                aria-hidden="true"
                className="border-t-border-subtle mx-2 my-2 border-t"
              />
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const { path, label, icon: Icon } = item;
                const isActive = isItemActive(item, pathname);
                return (
                  <Link
                    key={path}
                    href={path}
                    title={collapsed ? label : undefined}
                    className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:opacity-90 ${
                      isActive
                        ? "bg-bg-active text-text-primary"
                        : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* フッター */}
      <div className="border-t-border-default space-y-1 border-t px-2 pt-2">
        <ThemeToggle collapsed={collapsed} initialTheme={initialTheme} />
        {collapsed ? (
          <Link
            href="/"
            title="ホームへ戻る"
            className="text-text-subtle hover:bg-bg-active hover:text-text-primary flex min-h-[44px] justify-center rounded-lg px-2.5 py-2 transition-colors"
          >
            <ExternalLink size={13} />
          </Link>
        ) : (
          <Link
            href="/"
            className="text-text-subtle hover:bg-bg-active hover:text-text-primary flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors"
          >
            <ExternalLink size={11} />
            ホームへ戻る
          </Link>
        )}
      </div>
    </aside>
  );
};
