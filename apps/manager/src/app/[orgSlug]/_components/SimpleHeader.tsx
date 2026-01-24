"use client";

import Link from "next/link";
import Image from "next/image";
import { HeaderClient } from "@/app/_components/HeaderClient";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { Menu } from "lucide-react";
import { useSetAtom } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { useSession } from "next-auth/react";
import { NotificationCenter } from "./notification/NotificationCenter";

export const SimpleHeader = () => {
  const { data: session } = useSession();
  const setIsOpen = useSetAtom(sidebarOpenAtom);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        picture: session.user.image,
      }
    : undefined;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between px-4">
        {/* 左側: モバイルメニューボタン、ロゴと組織スイッチャー */}
        <div className="flex items-center gap-4">
          {/* モバイル用サイドバー開閉ボタン */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="hover:bg-accent rounded-lg p-2 transition-colors md:hidden"
            aria-label="メニューを開く"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/favicon/logo.svg"
              alt="Tumiki"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="font-bold">Tumiki</span>
          </Link>

          {/* 組織スイッチャー */}
          <OrganizationSwitcher />
        </div>

        {/* 右側: 通知センターとユーザーメニュー */}
        <div className="ml-auto flex items-center gap-2">
          <NotificationCenter />
          <HeaderClient user={user} />
        </div>
      </div>
    </header>
  );
};
