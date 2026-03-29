import type { JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import {
  Home,
  Wrench,
  History,
  ShieldCheck,
  Bell,
  Settings,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  Users,
  Shield,
  Server,
  Activity,
  ClipboardCheck,
} from "lucide-react";
import { themeAtom, sidebarOpenAtom } from "../store/atoms";

type NavItem = {
  path: string;
  label: string;
  icon: JSX.Element;
};

const mainNav: NavItem[] = [
  { path: "/", label: "ホーム", icon: <Home size={18} /> },
  { path: "/tools", label: "コネクト", icon: <Wrench size={18} /> },
  { path: "/history", label: "操作履歴", icon: <History size={18} /> },
  { path: "/requests", label: "権限申請", icon: <ShieldCheck size={18} /> },
];

const adminNav: NavItem[] = [
  { path: "/admin/users", label: "ユーザー", icon: <Users size={18} /> },
  { path: "/admin/roles", label: "ロール", icon: <Shield size={18} /> },
  { path: "/admin/tools", label: "ツール管理", icon: <Server size={18} /> },
  { path: "/admin/audit", label: "監査ログ", icon: <Activity size={18} /> },
  {
    path: "/admin/approvals",
    label: "承認管理",
    icon: <ClipboardCheck size={18} />,
  },
];

const notificationNav: NavItem = {
  path: "/notifications",
  label: "通知",
  icon: <Bell size={18} />,
};

// 未読通知数（モック値）
const UNREAD_COUNT = 2;

const subNav: NavItem[] = [
  { path: "/settings", label: "設定", icon: <Settings size={18} /> },
];

export const Sidebar = (): JSX.Element => {
  const location = useLocation();
  const [theme, setTheme] = useAtom(themeAtom);
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const renderLink = (item: NavItem) => {
    const isActive =
      item.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
        style={
          isActive
            ? {
                backgroundColor: "var(--bg-active)",
                color: "var(--text-primary)",
              }
            : { color: "var(--text-muted)" }
        }
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }
        }}
        title={!isOpen ? item.label : undefined}
      >
        {item.icon}
        {isOpen && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className="flex flex-col py-3 transition-all duration-200"
      style={{
        width: isOpen ? 220 : 56,
        backgroundColor: "var(--bg-app)",
        flexShrink: 0,
      }}
    >
      {/* ワークスペース */}
      <div className="mb-4 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{
              backgroundColor: "var(--bg-active)",
              color: "var(--text-primary)",
            }}
          >
            T
          </div>
          {isOpen && (
            <span
              className="truncate text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              TUMIKI
            </span>
          )}
        </div>
        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="shrink-0 rounded-md p-1 transition-colors"
            style={{ color: "var(--text-subtle)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-subtle)";
            }}
            aria-label="サイドバーを閉じる"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* 収納時の展開ボタン */}
      {!isOpen && (
        <div className="mb-2 px-3">
          <button
            onClick={() => setIsOpen(true)}
            className="flex w-full items-center justify-center rounded-md p-1.5 transition-colors"
            style={{ color: "var(--text-subtle)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-subtle)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="サイドバーを開く"
          >
            <PanelLeft size={16} />
          </button>
        </div>
      )}

      {/* メインナビ */}
      <nav className="flex flex-1 flex-col px-2">
        <div className="space-y-0.5">{mainNav.map(renderLink)}</div>

        {/* 管理セクション */}
        <div
          className="mt-2 space-y-0.5 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {isOpen && (
            <div
              className="px-3 pt-1 pb-1 text-[10px] font-medium tracking-wider uppercase"
              style={{ color: "var(--text-subtle)" }}
            >
              管理
            </div>
          )}
          {adminNav.map(renderLink)}
        </div>

        {/* 通知リンク */}
        <div
          className="mt-2 space-y-0.5 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <Link
            to={notificationNav.path}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={
              location.pathname.startsWith(notificationNav.path)
                ? {
                    backgroundColor: "var(--bg-active)",
                    color: "var(--text-primary)",
                  }
                : { color: "var(--text-muted)" }
            }
            onMouseEnter={(e) => {
              if (!location.pathname.startsWith(notificationNav.path)) {
                e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!location.pathname.startsWith(notificationNav.path)) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
            title={!isOpen ? notificationNav.label : undefined}
          >
            <div className="relative">
              {notificationNav.icon}
              {UNREAD_COUNT > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold"
                  style={{
                    backgroundColor: "var(--badge-error-text)",
                    color: "#fff",
                  }}
                >
                  {UNREAD_COUNT}
                </span>
              )}
            </div>
            {isOpen && <span>{notificationNav.label}</span>}
          </Link>
        </div>

        {/* 下部: 設定 + テーマ切替 */}
        <div
          className="mt-auto space-y-0.5 pt-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {subNav.map(renderLink)}

          {/* テーマ切替 */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            aria-label={
              theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {isOpen && (
              <span>{theme === "dark" ? "ライトモード" : "ダークモード"}</span>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
};
