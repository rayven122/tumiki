"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Server, Settings, Users, Shield } from "lucide-react";

type OrgSidebarProps = {
  orgSlug: string;
  isPersonal: boolean;
};

export const OrgSidebar = ({ orgSlug, isPersonal }: OrgSidebarProps) => {
  const pathname = usePathname();

  const navigation = [
    {
      name: "ダッシュボード",
      href: `/${orgSlug}/dashboard`,
      icon: LayoutDashboard,
      show: !isPersonal, // 個人組織では非表示
    },
    {
      name: "MCPサーバー",
      href: `/${orgSlug}/mcps`,
      icon: Server,
      show: true, // 全組織で表示
    },
    {
      name: "メンバー管理",
      href: `/${orgSlug}/members`,
      icon: Users,
      show: !isPersonal, // 個人組織では非表示
    },
    {
      name: "ロール・権限",
      href: `/${orgSlug}/roles`,
      icon: Shield,
      show: !isPersonal, // 個人組織では非表示
    },
    {
      name: "組織設定",
      href: `/${orgSlug}/settings`,
      icon: Settings,
      show: !isPersonal, // 個人組織では非表示
    },
  ].filter((item) => item.show);

  return (
    <aside className="bg-muted/40 hidden w-64 flex-col border-r md:flex">
      <div className="flex-1 overflow-auto py-6">
        <nav className="grid gap-1 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
