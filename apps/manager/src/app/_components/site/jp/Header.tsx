"use client";

import Link from "next/link";
import Image from "next/image";
import { LanguageToggle } from "../LanguageToggle";

interface NavItem {
  label: string;
  href: string;
}

interface HeaderProps {
  setShowModal?: (show: boolean) => void;
  showCTA?: boolean;
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { label: "Tumiki MCPとは", href: "/jp#about" },
  // { label: "ブログ", href: "/blog" },
];

export const Header = ({
  setShowModal,
  showCTA = true,
  navItems = defaultNavItems,
}: HeaderProps) => {
  return (
    <header className="fixed top-0 z-50 w-full border-b-2 border-black bg-white transition-all duration-300">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/jp" className="flex items-center gap-2 md:gap-3">
          <Image
            src="/favicon/logo.svg"
            alt="Tumiki Logo"
            width={24}
            height={24}
            className="h-6 w-6 md:h-8 md:w-8"
          />
          <span className="text-xl font-black tracking-tight text-black md:text-2xl">
            Tumiki MCP
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-2 md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative hidden font-medium text-gray-600 transition-colors hover:text-black md:block"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-black transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <LanguageToggle />
          {showCTA && setShowModal && (
            <button
              onClick={() => setShowModal(true)}
              className="border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white shadow-[2px_2px_0_#6366f1] transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#6366f1] md:px-7 md:py-3 md:shadow-[3px_3px_0_#6366f1] md:hover:-translate-x-1 md:hover:-translate-y-1 md:hover:shadow-[6px_6px_0_#6366f1]"
            >
              無料で試す
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
