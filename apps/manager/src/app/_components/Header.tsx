import Link from "next/link";
import Image from "next/image";
import { OrganizationNavigation } from "@/app/_components/OrganizationNavigation";
import { HeaderClient } from "@/app/_components/HeaderClient";
import { auth } from "@tumiki/auth/server";

export const Header = async () => {
  const session = await auth();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        picture: session.user.picture,
      }
    : undefined;
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

        <HeaderClient user={user} />
      </div>

      {/* Mobile navigation */}
      <div className="border-t md:hidden">
        <div className="space-y-2 p-2">
          {/* モバイル組織ナビゲーション */}
          <div className="flex items-center justify-center">
            <OrganizationNavigation />
          </div>
        </div>
      </div>
    </header>
  );
};
