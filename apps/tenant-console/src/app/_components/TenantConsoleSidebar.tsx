"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ExternalLink,
  KeyRound,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import ThemeToggle, { type Theme } from "./ThemeToggle";

const NAV_ITEMS = [
  { path: "/tenants", label: "テナント", icon: Building2 },
  { path: "/licenses", label: "ライセンス", icon: KeyRound },
] as const;

const isActivePath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const TenantConsoleSidebar = ({ initialTheme }: { initialTheme: Theme }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`bg-bg-app border-r-border-default flex min-h-screen shrink-0 flex-col border-r py-3 transition-all duration-200 ${collapsed ? "w-14" : "w-[220px]"}`}
    >
      <div className="border-b-border-default flex items-center justify-between border-b px-3 pb-3">
        {!collapsed && (
          <span className="text-text-primary text-sm font-semibold">
            Tenant Console
          </span>
        )}
        <button
          type="button"
          aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className={`text-text-muted hover:bg-bg-active hover:text-text-primary flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors ${collapsed ? "mx-auto" : "ml-auto"}`}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActivePath(pathname, path);
          return (
            <Link
              key={path}
              href={path}
              title={collapsed ? label : undefined}
              className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-2 text-sm transition-colors hover:opacity-90 ${collapsed ? "justify-center" : ""} ${active ? "bg-bg-active text-text-primary" : "text-text-secondary"}`}
            >
              <Icon size={15} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-border-default space-y-1 border-t px-2 pt-2">
        <ThemeToggle collapsed={collapsed} initialTheme={initialTheme} />
        {collapsed ? (
          <Link
            href="/"
            title="ホームへ戻る"
            className="text-text-subtle hover:bg-bg-active hover:text-text-primary flex min-h-[44px] items-center justify-center rounded-lg px-2 transition-colors"
          >
            <ExternalLink size={13} />
          </Link>
        ) : (
          <Link
            href="/"
            className="text-text-subtle hover:bg-bg-active hover:text-text-primary flex min-h-[44px] items-center gap-2.5 rounded-lg px-2 text-xs transition-colors"
          >
            <ExternalLink size={11} />
            ホームへ戻る
          </Link>
        )}
      </div>
    </aside>
  );
};

export default TenantConsoleSidebar;
