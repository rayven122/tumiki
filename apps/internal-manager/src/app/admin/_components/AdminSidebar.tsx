"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardCheck,
  ExternalLink,
  History,
  PanelLeft,
  PanelLeftClose,
  Server,
  Shield,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/admin", label: "ダッシュボード", icon: Activity },
  { path: "/admin/history", label: "操作履歴", icon: History },
  { path: "/admin/users", label: "ユーザー管理", icon: Users },
  { path: "/admin/roles", label: "ロール管理", icon: Shield },
  { path: "/admin/tools", label: "ツール管理", icon: Server },
  { path: "/admin/approvals", label: "承認管理", icon: ClipboardCheck },
] as const;

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className="flex shrink-0 flex-col py-3 transition-all duration-200"
      style={{
        width: collapsed ? 56 : 220,
        backgroundColor: "var(--bg-app)",
        borderRight: "1px solid var(--border)",
        minHeight: "100vh",
      }}
    >
      {/* ロゴ + 折りたたみボタン */}
      <div
        className="flex items-center justify-between px-3 pb-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {!collapsed && (
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Tumiki
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`rounded p-1 transition-opacity hover:opacity-80 ${collapsed ? "mx-auto" : "ml-auto"}`}
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              href={path}
              title={collapsed ? label : undefined}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:opacity-90"
              style={{
                backgroundColor: isActive ? "var(--bg-active)" : "transparent",
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              }}
            >
              <Icon size={15} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* フッター */}
      <div
        className="px-3 pt-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {collapsed ? (
          <Link
            href="/"
            title="ホームへ戻る"
            className="flex justify-center"
            style={{ color: "var(--text-subtle)" }}
          >
            <ExternalLink size={13} />
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs hover:opacity-80"
            style={{ color: "var(--text-subtle)" }}
          >
            <ExternalLink size={11} />
            ホームへ戻る
          </Link>
        )}
      </div>
    </aside>
  );
};
