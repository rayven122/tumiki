"use client";

import { Button } from "@tumiki/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumiki/ui/dropdown-menu";
import { Settings, User, ChevronDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import { guestRegex } from "@/lib/constants";

interface HeaderClientProps {
  user?: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  };
}

export const HeaderClient = ({ user }: HeaderClientProps) => {
  const params = useParams();
  const pathname = usePathname();
  const orgSlug = params.orgSlug as string | undefined;

  const isGuest = useMemo(() => {
    return guestRegex.test(user?.email ?? "");
  }, [user?.email]);

  const profilePath = `/${orgSlug}/profile`;
  const settingsPath = `/${orgSlug}/settings`;

  // アカウント切り替え（Keycloak + Auth.jsログアウト後、再ログイン画面へ）
  const switchAccountUrl = `/api/auth/switch-account?callbackUrl=${encodeURIComponent(pathname ?? "/")}`;

  return (
    <div className="flex items-center space-x-3">
      {/* ユーザーメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex h-auto items-center space-x-2 px-3 py-2"
            aria-label="ユーザーメニューを開く"
          >
            {!user ? (
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
                    {isGuest ? "G" : (user?.email?.[0]?.toUpperCase() ?? "U")}
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
          <DropdownMenuItem asChild>
            <Link href={profilePath} className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>プロフィール</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={settingsPath} className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>設定</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={switchAccountUrl} className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>アカウント切り替え</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/api/auth/logout" className="flex items-center">
              ログアウト
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
