import Link from "next/link";
import Image from "next/image";
import { HeaderClient } from "@/app/_components/HeaderClient";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { auth } from "~/auth";

export const SimpleHeader = async () => {
  const session = await auth();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        picture: session.user.image,
      }
    : undefined;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between px-4">
        {/* 左側: ロゴと組織スイッチャー */}
        <div className="flex items-center gap-4">
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

        {/* 右側: ユーザーメニュー */}
        <div className="ml-auto">
          <HeaderClient user={user} />
        </div>
      </div>
    </header>
  );
};
