"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/auth";
import { OrganizationNavigation } from "@/app/_components/OrganizationNavigation";

export function Header() {

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
          
          {/* 組織ナビゲーション */}
          <OrganizationNavigation />
        </div>

        <div className="flex items-center space-x-4">

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
        <nav className="flex items-center justify-center py-2">
          <OrganizationNavigation />
        </nav>
      </div>
    </header>
  );
}
