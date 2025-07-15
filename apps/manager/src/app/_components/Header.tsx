"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Settings, User, Database, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import { OrganizationSelector } from "@/components/organizations/OrganizationSelector";
import { useUser } from "@tumiki/auth/client";
import { useMemo } from "react";
import { guestRegex } from "@/lib/constants";

type NavigationItem = {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export const Header = () => {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  const isGuest = useMemo(() => {
    return guestRegex.test(user?.email ?? "");
  }, [user?.email]);

  const navigation: NavigationItem[] = [
    { name: "MCPサーバー", href: "/mcp/servers", icon: Database },
  ];

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mx-6 flex items-center space-x-2">
            <Image
              src="/favicon/logo.svg"
              alt="Tumiki"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="font-bold">Tumiki</span>
          </Link>
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

        <div className="flex items-center space-x-3">
          {/* 組織セレクター */}
          <OrganizationSelector />

          {/* ユーザーメニュー */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-auto items-center space-x-2 px-3 py-2"
                aria-label="ユーザーメニューを開く"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
                    <span className="text-muted-foreground text-sm">
                      読み込み中...
                    </span>
                  </div>
                ) : (
                  <>
                    {user?.picture ? (
                      <Image
                        src={user.picture}
                        alt={user.email ?? "ユーザーアバター"}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                        {isGuest
                          ? "G"
                          : (user?.email?.[0]?.toUpperCase() ?? "U")}
                      </div>
                    )}
                    <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
                      {isGuest
                        ? "ゲスト"
                        : (user?.name ?? user?.email ?? "ユーザー")}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <>
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    <div className="font-medium">
                      {isGuest ? "ゲストユーザー" : user.name}
                    </div>
                    <div className="truncate">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>設定</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>プロフィール</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center"
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
        <nav className="grid grid-cols-2 gap-1 p-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hover:bg-accent flex flex-col items-center justify-center space-y-1 rounded-md p-2 text-xs font-medium transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
