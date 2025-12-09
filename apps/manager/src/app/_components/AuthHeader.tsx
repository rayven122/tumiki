"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * 会員登録・ログイン画面用のシンプルなヘッダーコンポーネント
 * ロゴとTumikiのブランド名のみを表示し、操作は無効化されています
 */
export const AuthHeader = () => {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-14 w-full items-center px-4">
        <Link
          href="/"
          className="flex items-center space-x-2"
          onClick={(e) => e.preventDefault()}
          aria-disabled="true"
        >
          <Image
            src="/favicon/logo.svg"
            alt="Tumiki"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <span className="font-bold">Tumiki</span>
        </Link>
      </div>
    </header>
  );
};
