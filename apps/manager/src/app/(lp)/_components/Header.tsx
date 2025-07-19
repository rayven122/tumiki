"use client";

import Link from "next/link";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Tumiki
            </Link>
          </div>

          <nav className="hidden space-x-8 md:flex">
            <Link
              href="/"
              className="text-gray-700 transition-colors hover:text-gray-900"
            >
              トップ
            </Link>
            <Link
              href="/about"
              className="text-gray-700 transition-colors hover:text-gray-900"
            >
              サービス概要
            </Link>
            <Link
              href="/pricing"
              className="text-gray-700 transition-colors hover:text-gray-900"
            >
              料金プラン
            </Link>
            <Link
              href="#"
              className="text-gray-700 transition-colors hover:text-gray-900"
            >
              ログイン
            </Link>
          </nav>

          <div className="md:hidden">
            <button className="text-gray-700 hover:text-gray-900">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
