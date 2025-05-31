"use client";

import { Button } from "apps/manager/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "apps/manager/src/components/ui/dropdown-menu";
import { cn } from "apps/manager/src/lib/utils";
import { Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const navigation = [
    // { name: "ダッシュボード", href: "/dashboard" },
    { name: "MCPサーバー", href: "/mcp/servers" },
    // { name: "権限管理", href: "/permissions" },
    // { name: "プラグイン", href: "/plugins" },
  ];

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mx-6 flex items-center space-x-2">
            <span className="font-bold">Tumiki</span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hover:text-foreground/80 transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/60",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-2">
          {/* ユーザーメニュー */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>設定</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <span>プロフィール</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  ログアウト
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t md:hidden">
        <nav className="flex items-center justify-between px-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hover:text-foreground/80 flex flex-1 justify-center py-2 text-xs font-medium transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
