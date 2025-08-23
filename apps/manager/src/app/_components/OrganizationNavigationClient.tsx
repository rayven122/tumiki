"use client";

import { User, Building2, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { usePathname } from "next/navigation";

export const OrganizationNavigationClient = () => {
  const pathname = usePathname();
  const { currentOrganization } = useOrganizationContext();

  const navigation = currentOrganization && !currentOrganization.isPersonal
    ? [
        {
          name: "組織設定",
          href: "/organizations/dashboard",
          icon: Building2,
        },
        {
          name: "ロール管理",
          href: "/organizations/roles",
          icon: User,
        },
        {
          name: "MCPサーバー",
          href: "/mcp/servers",
          icon: Database,
        },
      ]
    : [
        {
          name: "MCPサーバー",
          href: "/mcp/servers",
          icon: Database,
        },
      ];

  return (
    <div className="flex items-center space-x-6">
      {/* 組織セレクター */}
      <OrganizationSwitcher />
            </SelectItem>
          ))}
          <SelectItem value="team_usage">
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>チーム利用</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* ナビゲーションリンク */}
      <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hover:text-foreground/80 flex items-center space-x-1 transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
