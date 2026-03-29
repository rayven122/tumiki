import type { JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Wrench, History, ShieldCheck, Settings } from "lucide-react";
import { clsx } from "clsx";

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
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
        )}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-56 border-r border-white/[0.08] bg-[#0a0a0a] p-3">
      <nav className="flex h-full flex-col">
        <div className="space-y-0.5">{mainNav.map(renderLink)}</div>
        <div className="mt-auto border-t border-white/[0.06] pt-3">
          {subNav.map(renderLink)}
        </div>
      </nav>
    </aside>
  );
};
