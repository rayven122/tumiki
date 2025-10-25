import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Server, Settings } from "lucide-react";
import { clsx } from "clsx";

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { path: "/", label: "ダッシュボード", icon: <Home size={20} /> },
  { path: "/servers", label: "MCPサーバー", icon: <Server size={20} /> },
  { path: "/settings", label: "設定", icon: <Settings size={20} /> },
];

export const Sidebar = (): React.ReactElement => {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50">
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
