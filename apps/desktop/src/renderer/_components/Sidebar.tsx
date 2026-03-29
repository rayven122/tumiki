import type { JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Wrench, History, ShieldCheck, Settings } from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: JSX.Element;
};

const mainNav: NavItem[] = [
  { path: "/", label: "ホーム", icon: <Home size={18} /> },
  { path: "/tools", label: "マイツール", icon: <Wrench size={18} /> },
  { path: "/history", label: "操作履歴", icon: <History size={18} /> },
  { path: "/requests", label: "権限申請", icon: <ShieldCheck size={18} /> },
];

const subNav: NavItem[] = [
  { path: "/settings", label: "設定", icon: <Settings size={18} /> },
];

export const Sidebar = (): JSX.Element => {
  const location = useLocation();

  const renderLink = (item: NavItem) => {
    const isActive =
      item.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
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
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className="w-56 p-3"
      style={{
        backgroundColor: "var(--bg-app)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <nav className="flex h-full flex-col">
        <div className="space-y-0.5">{mainNav.map(renderLink)}</div>
        <div
          className="mt-auto pt-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {subNav.map(renderLink)}
        </div>
      </nav>
    </aside>
  );
};
